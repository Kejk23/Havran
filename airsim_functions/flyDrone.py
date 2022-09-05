from turtle import distance
import airsim
import pprint
import time
import numpy as np
import math

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
    while not client.isApiControlEnabled():
        print("Client is waiting to take off")
        time.sleep(1)

    client.confirmConnection()
    client.enableApiControl(True)
    client.armDisarm(True)

    state = client.getMultirotorState()
    s = pprint.pformat(state)
    print("state: %s" % s)

    imu_data = client.getImuData()
    s = pprint.pformat(imu_data)
    print("imu_data: %s" % s)

    barometer_data = client.getBarometerData()
    s = pprint.pformat(barometer_data)
    print("barometer_data: %s" % s)

    magnetometer_data = client.getMagnetometerData()
    s = pprint.pformat(magnetometer_data)
    print("magnetometer_data: %s" % s)

    gps_data = client.getGpsData()
    s = pprint.pformat(gps_data)
    print("gps_data: %s" % s)
    """
    distancesensor_data = client.getDistanceSensorData()
    s = pprint.pformat(distancesensor_data)
    print("distancesensor_data: %s" % s)
    """ 
    client.takeoffAsync().join()
    
if __name__ == '__main__':
    
    
    # connect to the AirSim simulator
    client = airsim.MultirotorClient()
    # 
    initializeAirSimClient(client)
    client.simEnableWeather(True)
    
    while True:
        flyOverRectangleArea(client, np.array([[0, -80], [0, -9], [-98, -80], [-98, -9]]), 17, -1, 10)
    """
    client.moveToPositionAsync(0,-90, -1, 10).join()
    client.moveToPositionAsync(-20,-90,-1, 10).join()
    client.moveToPositionAsync(-20, -9, -1,10).join()
    client.moveToPositionAsync(-40, -9, -1, 10).join()
    client.moveToPositionAsync(-40, -80, -1,10).join()
    client.moveToPositionAsync(-54, -80, -1, 10).join()
    client.moveToPositionAsync(-54, -9, -1, 10).join()
    client.moveToPositionAsync(-74, -9, -1, 10).join()
    client.moveToPositionAsync(-74, -80, -1, 10).join()
    client.moveToPositionAsync(-88, -80, -1, 10).join()
    client.moveToPositionAsync(-88, -9, -1, 10).join()
    client.moveToPositionAsync(-98, -9, -1, 10).join()
    client.moveToPositionAsync(-98, -80, -1, 10).join()
    """
    resetAirSimClient(client)
