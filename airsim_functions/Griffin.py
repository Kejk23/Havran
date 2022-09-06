import os
import cv2
import time
import math
import redis
import airsim
import datetime
import numpy as np

from types import TracebackType
from multiprocessing import Process
from influxdb_client import Point
from paho.mqtt import client as mqtt_client


# connects to mqtt
def connect_mqtt():
    tempClient = mqtt_client.Client()
    try:
        tempClient.connect("localhost", 1883)
    except:
        print("Can't connect to MQTT at localhost:1883")
        while tempClient is None:
            try:
                tempClient.connect("localhost", 1883)
            except:
                pass
    return tempClient

# sends data to influx 
def send(data, client):
    p = Point("environment") \
        .tag("clientId", "drone") \
        .time(datetime.datetime.utcnow())

    for key, value in data.items():
        p = p.field(key, float(value))
        
    client.publish("iot_center", p.to_line_protocol())

# connects to redis
def connect_redis():
    tempConn = None
    try:
        tempConn = redis.Redis(host="localhost", port=6379)
    except: 
        print("Can't connect to Redis at localhost:6379")
        while tempConn in None:
            try:
                tempConn = redis.Redis(host="localhost", port=6379)
            except:
                pass
    return tempConn

# set the camera pose of the drone while flying
def setCameraPose(client):
    camera_pose = airsim.Pose(airsim.Vector3r(0, 0, 0), airsim.to_quaternion(-1.5708, 0, 0))
    client.simSetCameraPose(1, camera_pose)

# add real time images captured by drone to the redis stream
def addToStream(conn, img_rgb, iteration, imagename, maxImages):
    _, data = cv2.imencode('.jpg', img_rgb)
    storedimg = data.tobytes()
    iteration = [] # this may couse troubles
    iteration.append(['imagename',imagename])
    iteration.append(['image',storedimg])
    iteration.append(['isDone','0'])
    conn.execute_command('xadd', 'inspectiondata',  'MAXLEN', '~', str(maxImages), '*', *sum(iteration, []))

# get the images of the land taken by drone
def getRealTimeImage(client):

    temp_dir = os.mkdir.join(os.getcwd(), "airsim_drone")
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

# magic code
def flyOverRectangleArea(client, corners, spacing, height, velocity):
    corners = corners[corners[:, 0].argsort()]
    firstVector = [-corners[0][0]+corners[1][0],
    -corners[0][1]+corners[1][1]]
    secondVector = [-corners[0][0]+corners[2][0],
    -corners[0][1]+corners[2][1]]
    length = math.sqrt(firstVector[0]**2 + firstVector[1]**2)
    unitVecotr = [x / length for x in firstVector]
    partialVector = [x * spacing for x in unitVecotr]
    steps = length / spacing
    cords = [[corners[0][0], corners[0][1]], [corners[2][0], corners[2][1]]]
    for x in range(int(steps)):
        cords.append([cords[1 + x][0] + partialVector[0], cords[1 + x][1] + partialVector[1]])
        cords.append([cords[2 + x][0] - secondVector[0] * (-1)**x, cords[2 + x][1] - secondVector[1] * (-1)**x])
    for x in range(len(cords)):
        client.moveToPositionAsync(float(cords[x][0]), float(cords[x][1]), height, velocity).join()
    client.moveToPositionAsync(float(cords[0][0]), float(cords[0][1]), height, velocity).join()
    

def resetAirSimClient(client):
    client.hoverAsync().join()
    client.armDisarm(False)
    client.reset()
    client.enableApiControl(False)
    
def initializeAirSimClient(client):
    if not client.isApiControlEnabled():
        client.confirmConnection()
        client.enableApiControl(True)
        client.armDisarm(True)
        client.simEnableWeather(True)

def getAirSimClient():
    tempClient = None
    try:
        tempClient = airsim.MultirotorClient()
    except:
        print("Airsim is not ready yet")
        while tempClient is None:
            try:
                tempClient = airsim.MultirotorClient()
            except:
                pass
    return tempClient

# tells drone Where to fly
def flyDrone():
    flyClient = getAirSimClient()
    initializeAirSimClient(flyClient)
    flyClient.takeoffAsync().join()
    flyOverRectangleArea(flyClient, np.array([[0, -80], [0, -9], [-98, -80], [-98, -9]]), 17, -1, 10)
    resetAirSimClient(flyClient)

# Collects data from drone
def captureData():
    client_mqtt = connect_mqtt()
    dataClient = getAirSimClient()
    initializeAirSimClient(dataClient)

    sensor_data = {}
    while dataClient.isApiControlEnabled():
        state = dataClient.getMultirotorState()
        sensor_data['speed_x'] = state.kinematics_estimated.linear_velocity.x_val
        sensor_data['speed_y'] = state.kinematics_estimated.linear_velocity.y_val
        sensor_data['speed_z'] = state.kinematics_estimated.linear_velocity.z_val
        sensor_data['speed'] = math.sqrt(sensor_data['speed_x']**2+sensor_data['speed_y']**2+sensor_data['speed_z']**2)
        sensor_data['altitude'] = state.gps_location.altitude
        sensor_data['longtitude'] = state.gps_location.longitude
        sensor_data['latitude'] = state.gps_location.latitude
        sensor_data['orientation_quaternion_w'] = state.kinematics_estimated.orientation.w_val
        sensor_data['orientation_quaternion_x'] = state.kinematics_estimated.orientation.x_val
        sensor_data['orientation_quaternion_y'] = state.kinematics_estimated.orientation.y_val
        sensor_data['orientation_quaternion_z'] = state.kinematics_estimated.orientation.z_val

        enviroment = dataClient.simGetGroundTruthEnvironment()
        sensor_data['air_pressure'] = enviroment.air_pressure
        sensor_data['temperature'] = enviroment.temperature
        sensor_data['air_density'] = enviroment.air_density

        send(sensor_data, client_mqtt)
        time.sleep(0.1) # Interval

def captureImages():
    # connedcts to redis and Airsim
    conn = connect_redis()

    # creating the consumer group if it does not exist to read the data from the stream
    try:
        conn.execute_command('xgroup','CREATE','inspection','InspectionGroup','$','MKSTREAM')
    except:
        print("Consumer Group already  exist")

    # waing to receive Input the redis stream and once the signal is received drone starts flying and stores real time images to Influx in form of bytes.
    res = None
    try:
        res = conn.execute_command('xreadgroup','GROUP', 'InspectionGroup','InspectionConsumer','Block', 10000,'STREAMS', 'inspection','>')
    except:
        print("No Input from stream yet")
        while res is None:
            try:
                res = conn.execute_command('xreadgroup','GROUP', 'InspectionGroup','InspectionConsumer','Block', 10000,'STREAMS', 'inspection','>')
            except:
                pass
     
    print("Signal received from stream")

    # Prints important IDs
    count = 1
    MAX_IMAGES = 50
    currentStreamMapList = list(convertToMap(res[0][1][0]))
    streamID = currentStreamMapList[0]
    inspectionId = currentStreamMapList[1]['inspectionId']
    print("Inspection ID is " + inspectionId )
    print("Stream ID is " + streamID )
    
    imageClient = getAirSimClient()
    initializeAirSimClient(imageClient)
    setCameraPose(imageClient)

    # works every time 
    res = conn.execute_command('xack','inspection','InspectionGroup',streamID)
    print("Stream Acknowledged " + str(res))

    while imageClient.isApiControlEnabled():
        imagename = inspectionId + "_" + str(count) + '.jpg'
        img_rgb = getRealTimeImage(imageClient)
        addToStream(conn,img_rgb,imagename,MAX_IMAGES)
        time.sleep(2)
        print(count)
        count += 1

    # good ending
    lastRow = []
    lastRow.append(['isDone','1'])
    lastRow.append(['imagename',''])
    lastRow.append(['image',''])
    print("Saving Final Row")
    conn.execute_command('xadd', 'inspectiondata',  'MAXLEN', '~', str(MAX_IMAGES), '*', *sum(lastRow,[]))

if __name__ == '__main__':
    Process(target=flyDrone).start()
    Process(target=captureData).start()
    Process(target=captureImages).start()
