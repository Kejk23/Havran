from types import TracebackType
from influxdb_client import Point
from paho.mqtt import client as mqtt_client
import datetime
import airsim
import time

# connects to mqtt
def connect_mqtt():
    def onconnect(rc):
        if rc == 0:
            print("Connected to MQTT Broker!")
        else:
            print("Failed to connect, return code %d\n", rc)

    client2 = mqtt_client.Client()
    client2.on_connect = onconnect
    client2.connect("localhost", 1883)
    return client2

# sends data to influx 
def send(data):
    p = Point("environment") \
        .tag("clientId", "drone") \
        .time(datetime.datetime.utcnow())

    for key, value in data.items():
        p = p.field(key, float(value))
        
    client_mqtt.publish("iot_center", p.to_line_protocol())

if __name__ == '__main__':
    # connects mqtt
    client_mqtt = connect_mqtt()

    # sleeping for airsim to start
    client = None
    while client is None:
        try:
            client = airsim.MultirotorClient()
            client.confirmConnection()
        except:
            print("Airsim is not ready yet")
            time.sleep(1)

    while not client.isApiControlEnabled():
        print("Please, start the flight and enable api control")
        time.sleep(1)

    sensor_data = {}

    while client.isApiControlEnabled():
        state = client.getMultirotorState()
        send({'speed_b' : float(state.kinematics_estimated.linear_velocity.x_val)})
        time.sleep(0.1)




        """
    def state_callback(state):
        sensor_data['motor_a'] = state['linear_acceleration']['x_val']
        send({'motor_a' : 10})
        client.getDistanceSensorData.subsribe(distance_callback)
        simGetCameraInfo
        simGetVehiclePose
        getImuData
        getBarometerData
        getMagnetometerData
        getGpsData
        getDistanceSensorData
        getLidarData
            client.getMultirotorState=state_callback
        """
    # sends pictures to redis
