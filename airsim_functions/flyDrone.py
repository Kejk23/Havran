import airsim
import argparse
import pprint
import time
import numpy as np
import math

def flyOverRectangleArea(corners, spacing, height, velocity):
    corners = corners[corners[:, 0].argsort()]
    firstVector = [corners[0][0]-corners[1][0],
    corners[0][1]-corners[1][1]]
    secondVector = [corners[0][0]-corners[2][0],
    corners[0][1]-corners[2][1]]
    length = math.sqrt(firstVector[0]**2 + firstVector[1]**2)
    unitVecotr = firstVector / length
    partialVector = unitVecotr * spacing
    steps = length / spacing
    cords = [[corners[0][0], corners[0][1]], [corners[2][0], corners[2][1]]]
    for x in range(steps):
        cords[2 + x] = cords[1 + x] + firstVector
        cords[3 + x] = cords[2 + x] + secondVector
    for x in range(len(cords)):
        client.moveToPositionAsync(*cords, height, velocity)
    
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

    client.takeoffAsync().join()

    state = client.getMultirotorState()
    print("state: %s" % pprint.pformat(state))
    
if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--level', help='Game Level', type=int, default=1)
    args = parser.parse_args()
    
    # connect to the AirSim simulator
    client = airsim.MultirotorClient()
    initializeAirSimClient(client)

    gameLevel = args.level
    print('Level' + str(gameLevel))
    client.simEnableWeather(True)
        
    # set the coordinates to set up the path for drone to travel
    if gameLevel == 3:
        #flyOverRectangleArea(np.array([0, -80], [0, -9], [-98, -80], [-98, -9]), 17, -1, 10)
            
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
    
    if gameLevel == 2:
        #flyOverRectangleArea(np.array([0, -90], [0, -5], [-98, -90], [-98, -5]), 17, -2, 8)

        client.moveToPositionAsync(0,-102, -2, 8).join()
        client.moveToPositionAsync(-28,-92,-2, 8).join()
        client.moveToPositionAsync(-28, -5, -2,8).join()
        client.moveToPositionAsync(-39, -5, -2, 8).join()
        client.moveToPositionAsync(-39, -90, -2,8).join()
        client.moveToPositionAsync(-59, -90, -2, 8).join()
        client.moveToPositionAsync(-59, -5, -2, 8).join()
        client.moveToPositionAsync(-78, -5, -2, 8).join()
        client.moveToPositionAsync(-78, -90, -2, 8).join()
        client.moveToPositionAsync(-88, -90, -2, 8).join()
        client.moveToPositionAsync(-88, -5, -2, 8).join()
        client.moveToPositionAsync(-98, -5, -2, 8).join()
        client.moveToPositionAsync(-98, -90, -2, 8).join()
    
    if gamelevel == 1:
        #flyOverRectangleArea(np.array([0, -90], [0, -9], [-98, -78], [-98, -9]), 17, 0, 10)

        client.moveToPositionAsync(0,-85, 0, 10).join()
        client.moveToPositionAsync(-14,-85,0, 10).join()
        client.moveToPositionAsync(-14, -9, 0, 10).join()
        client.moveToPositionAsync(-30, -9, 0, 10).join()
        client.moveToPositionAsync(-30, -78, 0, 10).join()
        client.moveToPositionAsync(-48, -78, 0, 10).join()
        client.moveToPositionAsync(-48, -9, 0, 10).join()
        client.moveToPositionAsync(-65, -9, 0, 10).join()
        client.moveToPositionAsync(-65, -78, 0, 10).join()
        client.moveToPositionAsync(-80, -78, 0, 10).join()
        client.moveToPositionAsync(-80, -9, 0, 10).join()
        client.moveToPositionAsync(-98, -9, 0, 10).join()
        client.moveToPositionAsync(-98, -78, 0, 10).join()
        
    #stop and return the simulator to initial state
    resetAirSimClient(client)
