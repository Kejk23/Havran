#!/bin/bash
docker run -it --rm --name rabbitmq -p 1883:1883 -p 5672:5672 -p 15672:15672 -v $(pwd)/rabbitmq/etc/rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins rabbitmq:3-management
