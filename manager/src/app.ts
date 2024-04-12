import 'dotenv/config';

import { externalLogger, internalLogger } from './logger.js';

import createTask from './routes/createTask.js';
import errorHander from './middlewares/errorHander.js';
import express from 'express';
import getTaskStatus from './routes/getTaskStatus.js';
import loggerHandler from './middlewares/loggerHandler.js';
import updateTaskStatus from './routes/updateTaskStatus.js';

const {
    INTERNAL_MANAGER_PORT,
    EXTERNAL_MANAGER_PORT,
    INTERNAL_WORKER_HOST,
    WORKER_PORT,
} = process.env;

const createTaskWorkerUrl = `http://${INTERNAL_WORKER_HOST}:${WORKER_PORT}/internal/api/worker/hash/crack/task`;
const createTaskPath = '/api/hash/crack';
const getTaskStatusPath = '/api/hash/status/:requestId';
const updateTaskStatusPath = '/internal/api/manager/hash/crack/request';

const internalApp = express();
const externalApp = express();

externalApp
    .use(express.json())
    .use(loggerHandler(externalLogger))
    .post(createTaskPath, createTask(createTaskWorkerUrl))
    .get(getTaskStatusPath, getTaskStatus)
    .use(errorHander(externalLogger));

internalApp
    .use(express.json())
    .use(loggerHandler(internalLogger))
    .patch(updateTaskStatusPath, updateTaskStatus)
    .use(errorHander(internalLogger));

internalApp.listen(Number(INTERNAL_MANAGER_PORT!), () => { });
externalApp.listen(Number(EXTERNAL_MANAGER_PORT!), () => { });
