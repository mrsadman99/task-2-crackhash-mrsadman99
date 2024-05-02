#!/bin/bash

cd ../logs && rm *
cd ../deploy

docker compose cp manager:/manager/logs/manager.log ../logs/manager.log
docker compose cp manager:/manager/logs/manager-error.log ../logs/manager-error.log
docker compose cp manager:/manager/logs/external-http.log ../logs/manager-http.log
docker compose cp manager:/manager/logs/db.log ../logs/manager-db.log

docker compose cp worker1:/worker/logs/worker-error.log ../logs/worker-error1.log
docker compose cp worker2:/worker/logs/worker-error.log ../logs/worker-error2.log
docker compose cp worker3:/worker/logs/worker-error.log ../logs/worker-error3.log
docker compose cp worker4:/worker/logs/worker-error.log ../logs/worker-error4.log

docker compose cp worker1:/worker/logs/task.log ../logs/task1.log
docker compose cp worker2:/worker/logs/task.log ../logs/task2.log
docker compose cp worker3:/worker/logs/task.log ../logs/task3.log
docker compose cp worker4:/worker/logs/task.log ../logs/task4.log

docker compose cp worker1:/worker/logs/worker.log ../logs/worker1.log
docker compose cp worker2:/worker/logs/worker.log ../logs/worker2.log
docker compose cp worker3:/worker/logs/worker.log ../logs/worker3.log
docker compose cp worker4:/worker/logs/worker.log ../logs/worker4.log
