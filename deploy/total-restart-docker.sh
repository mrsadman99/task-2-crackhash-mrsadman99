#!/bin/bash

docker compose stop
yes | docker compose rm
yes | docker rm $(docker compose ps -aq)
docker volume rm $(docker volume ls -q)
docker compose up -d --force-recreate --build
