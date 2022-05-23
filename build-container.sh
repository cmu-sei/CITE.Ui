#!/bin/bash

docker build . -t cite/ui --no-cache
docker-compose up -d
