import 'dotenv/config';

import createTask from './routes/createTask.js';
import errorHander from './middlewares/errorHander.js';
import express from 'express';

const {
    WORKER_PORT,
    INTERNAL_MANAGER_HOST,
    INTERNAL_MANAGER_PORT,
} = process.env;

const createTaskPath = '/internal/api/worker/hash/crack/task';
const updateTaskStatusUrl = `http://${INTERNAL_MANAGER_HOST}:${INTERNAL_MANAGER_PORT}/internal/api/manager/hash/crack/request`;

const workerApi = express();

workerApi
    .use(express.json())
    .post(createTaskPath, createTask(updateTaskStatusUrl))
    .use(errorHander)
    .listen(Number(WORKER_PORT!), () => { });
