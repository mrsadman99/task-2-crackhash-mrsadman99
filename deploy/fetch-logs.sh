#!/bin/bash

cd ./logs && rm * && cd ..

docker compose exec manager cat /manager/logs/manager.log > logs/manager.log
docker compose exec worker1 cat /worker/logs/task.log > ./logs/task1.log
docker compose exec worker2 cat /worker/logs/task.log > ./logs/task2.log
docker compose exec worker3 cat /worker/logs/task.log > ./logs/task3.log
docker compose exec worker4 cat /worker/logs/task.log > ./logs/task4.log

docker compose exec worker1 cat /worker/logs/worker.log > ./logs/worker1.log
docker compose exec worker2 cat /worker/logs/worker.log > ./logs/worker2.log
docker compose exec worker3 cat /worker/logs/worker.log > ./logs/worker3.log
docker compose exec worker4 cat /worker/logs/worker.log > ./logs/worker4.log
