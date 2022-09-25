REM https://github.com/bonitoo-io/iot-center-v2

REM SET INFLUX_URL=https://us-west-2-1.aws.cloud2.influxdata.com
SET INFLUX_URL=<copy url from your web browser>
REM SET INFLUX_TOKEN=h14b3X2n4kc8Q_jYPpwdjkv3dAZRorNQnN67pMwKs1lGgbMW8vWRjAi7VvkUitQMii2XwJM9qX3cnK4oAZDIjg==
SET INFLUX_TOKEN=<generated token in the InfluxDB UI>
REM SET INFLUX_ORG=iotCenter@influxdata.com
SET INFLUX_ORG=<your email>

REM SET INFLUX_BUCKET=iot_center
REM SET INFLUX_BUCKET_AUTH=iot_center_devices

REM SET MQTT_TOPIC=iot_center
REM SET MQTT_URL=mqtt://localhost:1883
REM SET SERVER_PORT=5000

yarn install
yarn build
yarn start
