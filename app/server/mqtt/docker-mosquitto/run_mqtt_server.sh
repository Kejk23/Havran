#!/bin/bash
docker run --rm -it --name mosquitto -p 1883:1883 -v $(pwd)/mosquitto:/mosquitto/ eclipse-mosquitto:2.0.10 
