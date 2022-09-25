REM https://github.com/bonitoo-io/iot-center-v2

REM SET INFLUX_URL=https://us-west-2-1.aws.cloud2.influxdata.com
REM   copy url from your web browser
REM SET INFLUX_TOKEN=h14b3X2n4kc8Q_jYPpwdjkv3dAZRorNQnN67pMwKs1lGgbMW8vWRjAi7VvkUitQMii2XwJM9qX3cnK4oAZDIjg==
REM   generated token in the InfluxDB UI
REM SET INFLUX_ORG=iotCenter@influxdata.com
REM   typically your email (can be changed)

SET INFLUX_URL=
SET INFLUX_TOKEN=
SET INFLUX_ORG=

REM SET INFLUX_BUCKET=iot_center
REM SET INFLUX_BUCKET_AUTH=iot_center_devices

REM SET MQTT_TOPIC=iot_center
REM SET MQTT_URL=mqtt://127.0.0.1:1883
REM SET SERVER_PORT=5000
REM SET PORT=3000

if [%1]==[mqtt] "C:\Program Files\Mosquitto\mosquitto.exe" -v
if [%1]==[mqtt] exit

if [%1]==[telegraf] telegraf --debug --config telegraf.conf
if [%1]==[telegraf] exit

yarn dev