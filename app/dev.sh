#!/bin/bash

# Source code: https://github.com/bonitoo-io/iot-center-v2
# INFLUX_URL
#  copy url from your web browser
#  example INFLUX_URL=https://us-west-2-1.aws.cloud2.influxdata.com
# INFLUX_TOKEN
#  generated token in the InfluxDB UI
#  example INFLUX_TOKEN=h14b3X2n4kc8Q_jYPpwdjkv3dAZRorNQnN67pMwKs1lGgbMW8vWRjAi7VvkUitQMii2XwJM9qX3cnK4oAZDIjg==
# INFLUX_ORG
#  typically your email - can be changed via UI or API
#  example INFLUX_ORG=iotCenter@influxdata.com

export INFLUX_URL=
export INFLUX_TOKEN=
export INFLUX_ORG=

# export INFLUX_BUCKET=iot_center
# export INFLUX_BUCKET_AUTH=iot_center_devices

# export MQTT_URL=mqtt://127.0.0.1:1883
# export MQTT_TOPIC=iot_center
# export SERVER_PORT=5000
# export PORT=3000

if [ "$1" = "mqtt" ]; then
  if [ "$(uname -s)" = "Darwin" ]; then
    /usr/local/opt/mosquitto/sbin/mosquitto
  else
    mosquitto -v
  fi
  exit
fi

if [ "$1" = "consumer" ]; then
  node server/mqtt/subscriber.js
  exit
fi

if [ "$1" = "telegraf" ]; then
  telegraf --debug --config telegraf.conf
  exit
fi

if [ ! -d "node_modules" ]; then
  yarn install
fi

#export NODE_OPTIONS=--openssl-legacy-provider
yarn dev
