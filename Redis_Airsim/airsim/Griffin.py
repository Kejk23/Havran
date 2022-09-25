import os
import cv2
import io
import time
import math
import redis
import airsim
import datetime
import numpy as np
from PIL import Image 
import binascii
import atexit

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
        connected = False
        while not connected:
            try:
                tempClient.connect("localhost", 1883)
                connected = True
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
    t = None
    try:
        tempConn = redis.Redis(host="localhost", port=6379)
        t = tempConn.ping()
    except: 
        print("Can't connect to Redis at localhost:6379")
        while t is None:
            try:
                tempConn = redis.Redis(host="localhost", port=6379)
                t = tempConn.ping()
            except:
                pass
    return tempConn
# set the camera pose of the drone while flying
def setCameraPose(client):
    camera_pose = airsim.Pose(airsim.Vector3r(0, 0, 0), airsim.to_quaternion(-1.5708, 0, 0))
    client.simSetCameraPose("1", camera_pose)

# add real time images captured by drone to the redis stream
def addToStream(conn, img_rgb, imagename, maxImages):
    _, data = cv2.imencode('.jpg', img_rgb) 
    storedimg = data.tobytes()
    iteration = [] 
    iteration.append(['weather','Sunny'])
    iteration.append(['windSpeed', 5])
    iteration.append(['imagename',imagename])
    iteration.append(['image',storedimg])
    iteration.append(['isDone','0'])
    try:
        conn.execute_command('xadd', 'inspectiondata', 'MAXLEN', '~', str(maxImages), '*', *sum(iteration, []))
    except:
        print("tak ses pica")
    #print(res)

# get the images of the land taken by drone
def getRealTimeImage(client):
    #simImage = client.simGetImage("1", airsim.ImageType.Scene)
    simImages = client.simGetImages([airsim.ImageRequest(1, airsim.ImageType.Scene, False, False),])
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

def flyOverRectangleArea(client, corners, spacing, height, velocity):
    # sorts corners according to their x coordinate 
    corners = corners[corners[:, 0].argsort()] 
    # sorts for the case where the recatangle is parallel to teh x axis, according to teir y coordinate
    if corners[0][0] == corners[1][0]:
        if corners[0][1] > corners[1][1]:
            t = corners[0][1]
            corners[0][1] = corners[1][1]
            corners[1][1] = t
        if corners[2][1] > corners[3][1]:
            t = corners[2][1]
            corners[2][1] = corners[3][1]
            corners[3][1] = t
    #this means that that the croner on the first set of cords is opposite to the one on the last set of cords

    # calculates the vector pointing from the first set of cords to the second one
    firstVector = [(corners[1][0] - corners[0][0]), (corners[1][1] - corners[0][1])]
    # calculates the vector pointing from the first set of cords to the third one
    secondVector = [(corners[2][0]-corners[0][0]), (corners[2][1]-corners[0][1])]
    # calculates the length of the first vector 
    length = math.sqrt(firstVector[0]**2 + firstVector[1]**2)
    # creates a vector with length 1 but with the same angle as firstVector
    unitVecotr = [x / length for x in firstVector]
    # creates a vector with the same angle as firstVector and with a given length
    partialVector = [x * spacing for x in unitVecotr]
    # calculates how many times has the drone travel a given length in firstVector's direction to reach the end
    steps = int(length / spacing)
    # calculates all the cords our drone needs to travel in order to scan the field
    cords = [[corners[0][0], corners[0][1]], [corners[2][0], corners[2][1]]]
    # it will fly in the secondVector's direction there and back again, but move in partialVector's direction each step
    for x in range(int(steps)):
        cords.append([(cords[2 * (x + 1) -1][0] + partialVector[0]), (cords[2 * (x + 1) -1][1] + partialVector[1])])
        cords.append([(cords[2 * (x + 1)][0] - secondVector[0] * (-1)**x), (cords[2 * (x + 1)][1] - secondVector[1] * (-1)**x)])
    # flies the actual drone
    cords.reverse() # optional step
    for x in range(len(cords)):
        print("Drone flies to cords x = " + str(float(cords[x][0])) + " and y = " + str(float(cords[x][1])))
        client.moveToPositionAsync(float(cords[x][0]), float(cords[x][1]), height, velocity).join()
    # returns back
    print("Drone returns back")
    client.moveToPositionAsync(0, 0, height, velocity).join() 
    

def resetAirSimClient(client):
    client.hoverAsync().join()
    client.armDisarm(False)
    client.reset()
    client.enableApiControl(False)
    
def initializeAirSimClient(client):
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
    while not flyClient.isApiControlEnabled():
        pass

    flyClient.takeoffAsync().join()
    flyOverRectangleArea(flyClient, np.array([[0, 0], [-100, 0], [0, -80], [-100, -80]]), 17, -1, 10)
    resetAirSimClient(flyClient)

# Collects data from drone
def captureData():
    client_mqtt = connect_mqtt()
    dataClient = getAirSimClient()

    while not dataClient.isApiControlEnabled():
        pass

    sensor_data = {}
    while dataClient.isApiControlEnabled():
        state = dataClient.getMultirotorState()
        sensor_data['speed_x'] = state.kinematics_estimated.linear_velocity.x_val
        sensor_data['speed_y'] = state.kinematics_estimated.linear_velocity.y_val
        sensor_data['speed_z'] = state.kinematics_estimated.linear_velocity.z_val
        sensor_data['speed'] = math.sqrt(sensor_data['speed_x']**2+sensor_data['speed_y']**2+sensor_data['speed_z']**2)

        sensor_data['acceleration_x'] = state.kinematics_estimated.linear_acceleration.x_val
        sensor_data['acceleration_y'] = state.kinematics_estimated.linear_acceleration.y_val
        sensor_data['acceleration_z'] = state.kinematics_estimated.linear_acceleration.z_val
        sensor_data['acceleration'] = math.sqrt(sensor_data['acceleration_x']**2+sensor_data['acceleration_y']**2+sensor_data['acceleration_z']**2)

        sensor_data['altitude'] = state.gps_location.altitude
        sensor_data['longtitude'] = state.gps_location.longitude
        sensor_data['latitude'] = state.gps_location.latitude

        sensor_data['orientation_quaternion_w'] = state.kinematics_estimated.orientation.w_val
        sensor_data['orientation_quaternion_x'] = state.kinematics_estimated.orientation.x_val
        sensor_data['orientation_quaternion_y'] = state.kinematics_estimated.orientation.y_val
        sensor_data['orientation_quaternion_z'] = state.kinematics_estimated.orientation.z_val

        sensor_data['x_coordinate'] = state.kinematics_estimated.position.x_val
        sensor_data['y_coordinate'] = state.kinematics_estimated.position.y_val
        sensor_data['z_coordinate'] = -state.kinematics_estimated.position.z_val

        #angular_velocity
        #angular_acceleration

        enviroment = dataClient.simGetGroundTruthEnvironment()
        sensor_data['air_pressure'] = enviroment.air_pressure
        sensor_data['temperature'] = enviroment.temperature
        sensor_data['air_density'] = enviroment.air_density

        sensor_data['gravitational_force_x'] = enviroment.gravity.x_val
        sensor_data['gravitational_force_y'] = enviroment.gravity.y_val
        sensor_data['gravitational_force_z'] = enviroment.gravity.z_val
        sensor_data['gravitational_force'] = math.sqrt(sensor_data['gravitational_force_x']**2+sensor_data['gravitational_force_y']**2+sensor_data['gravitational_force_z']**2)

        magnetometer = dataClient.getMagnetometerData()
        sensor_data['magnetic_field_strength_x'] = magnetometer.magnetic_field_body.x_val
        sensor_data['magnetic_field_strength_y'] = magnetometer.magnetic_field_body.y_val
        sensor_data['magnetic_field_strength_z'] = magnetometer.magnetic_field_body.z_val
        sensor_data['magnetic_field_strength'] = math.sqrt(sensor_data['magnetic_field_strength_x']**2+sensor_data['magnetic_field_strength_y']**2+sensor_data['magnetic_field_strength_z']**2)

        send(sensor_data, client_mqtt)
        time.sleep(0.1) # Interval

def captureImages():
    # connedcts to redis and Airsim
    conn = connect_redis()

    # creating the consumer group if it does not exist to read the data from the stream
    res = None
    try:
        res = conn.execute_command('xgroup','CREATE','inspection','InspectionGroup','$','MKSTREAM')   
    except:
        print("Failed to create consumer group") 
        """
        while res is None: # It would by better to check if it, perhaps, doesnt exist already
            try:
                res = conn.execute_command('xgroup','CREATE','inspection','InspectionGroup','$','MKSTREAM')    
            except:
                pass
                """

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
    print(res)
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
    try: 
        res = conn.execute_command('xack','inspection','InspectionGroup',streamID)
    except:
        print("What the fuck")
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
    lastRow.append(['weather','Sunny'])
    lastRow.append(['windSpeed', 5])
    lastRow.append(['isDone','1'])
    lastRow.append(['imagename',''])
    lastRow.append(['image',''])
    print("Saving Final Row")
    conn.execute_command('xadd', 'inspectiondata',  'MAXLEN', '~', str(MAX_IMAGES), '*', *sum(lastRow,[]))

if __name__ == '__main__':

    #flying_process = (Process(target=flyDrone).start())
    #sensors_process = (Process(target=captureData).start())
    camera_process = (Process(target=captureImages).start())