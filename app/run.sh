#!/bin/bash

#export INFLUX_URL=https://us-west-2-1.aws.cloud2.influxdata.com
#export INFLUX_TOKEN=h14b3X2n4kc8Q_jYPpwdjkv3dAZRorNQnN67pMwKs1lGgbMW8vWRjAi7VvkUitQMii2XwJM9qX3cnK4oAZDIjg==
#export INFLUX_ORG=IoTCenter

export INFLUX_URL=
export INFLUX_TOKEN=
export INFLUX_ORG=

# export INFLUX_BUCKET=iot_center
# export INFLUX_BUCKET_AUTH=iot_center_devices

# export MQTT_TOPIC=iot_center
# export MQTT_URL=mqtt://localhost:1883
# export SERVER_PORT=5000

set -euo pipefail
yarn install --frozen-lockfile
yarn build
yarn start
