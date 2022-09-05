import airsim
import time
import os
import numpy as np
import cv2
import redis
import datetime

from influxdb_client import Point
from paho.mqtt import client as mqtt_client

def connect_redis():
    r = redis.from_url(url='redis://localhost:6379')
    if not r.ping():
        print("Can't conncect to redis, please paste your redis URL here:")
        url = input()
        r = redis.from_url(url=str(url))
    return r

# set the camera pose of the drone while flying
def setCameraPose(client):
    camera_pose = airsim.Pose(airsim.Vector3r(0, 0, 0), airsim.to_quaternion(-1.5708, 0, 0))
    client.simSetCameraPose(1, camera_pose)

# add real time images captured by drone to the redis stream
def addToStream(conn,img_rgb,iteration,imagename,maxImages):
    _, data = cv2.imencode('.jpg', img_rgb)
    storedimg = data.tobytes()
    iteration.append(['imagename',imagename])
    iteration.append(['image',storedimg])
    iteration.append(['isDone','0'])
    conn.execute_command('xadd', 'inspectiondata',  'MAXLEN', '~', str(maxImages), '*', *sum(iteration, []))

# get the images of the land taken by drone
def getRealTimeImage(client,count):
    temp_dir = os.path.join(os.getcwd(), "airsim_drone")
    filepath = os.path.join(temp_dir, str(count))
    simImages = client.simGetImages([airsim.ImageRequest("1", airsim.ImageType.Scene, False, False)])
    simImage = simImages[0]
    img1d = np.fromstring(simImage.image_data_uint8, dtype=np.uint8)
    img_rgb = img1d.reshape(simImage.height, simImage.width, 3)
    return img_rgb
        
# coordinates system for redis 
def convertToMap(data):
    if isinstance(data, bytes):  return data.decode('ascii')
    if isinstance(data, dict):   return dict(map(convertToMap, data.items()))
    if isinstance(data, tuple):  return map(convertToMap, data)
    return data

if __name__ == '__main__':
    # connedcts to redis 
    conn = connect_redis()

    # set the weather conditions 
    input = []
    input.append(['weather','Rain'])
    input.append(['windSpeed',5])

    # creating the consumer group if it does not exist to read the data from the stream
    try:
        conn.execute_command('xgroup','CREATE','inspection','InspectionGroup','$','MKSTREAM')
    except:
        print("Consumer Group already  exist")
   
    # sleeping for airsim to start
    client = None
    while client is None:
        try:
            client = airsim.MultirotorClient()
            client.confirmConnection()
        except:
            print("Airsim is not ready yet")
            time.sleep(1)
        
    # sleeping to receive input the redis stream and once the signal is received drone starts flying and stores real time images to Influx in form of bytes.
    res = None
    while res is None:
        try:
            res = conn.execute_command('xreadgroup','GROUP', 'InspectionGroup','InspectionConsumer','Block', 10000,'STREAMS', 'inspection','>')
        except:
            print("No input from stream yet")
            time.sleep(1)
    print("Signal received from stream")

    #rest of the code
    count = 1
    MAX_IMAGES = 50
    currentStream = res[0][1][0]
    currentStreamMap = convertToMap(currentStream)
    currentStreamMapList = list(currentStreamMap)
    streamID = currentStreamMapList[0]
    inspectionId = currentStreamMapList[1]['inspectionId']
    print("Inspection ID is " + inspectionId )
    print("Stream ID is " + streamID )

    setCameraPose(client)
    client.enableApiControl(True)
    client.armDisarm(True)

    print("Drone is ready to fly now")

    while not client.isApiControlEnabled():
        print("Please, start the flight and enable api control")
        time.sleep(1)

    # works every time 
    res = conn.execute_command('xack','inspection','InspectionGroup',streamID)
    print("Stream Acknowledged " + str(res))

    while client.isApiControlEnabled():
        iteration = input[:]
        imagename = inspectionId + "_" + str(count) + '.jpg'
        img_rgb = getRealTimeImage(client,count)
        addToStream(conn,img_rgb,iteration,imagename,MAX_IMAGES)
        time.sleep(2)
        print(count)
        count += 1

    # good ending
    lastRow = input[:]
    lastRow.append(['isDone','1'])
    lastRow.append(['imagename',''])
    lastRow.append(['image',''])
    print("Saving Final Row")
    conn.execute_command('xadd', 'inspectiondata',  'MAXLEN', '~', str(MAX_IMAGES), '*', *sum(lastRow,[]))
    
