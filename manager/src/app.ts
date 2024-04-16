import 'dotenv/config';

import createTask from './routes/createTask.js';
import errorHandler from './middlewares/errorHandler.js';
import express from 'express';
import getTaskStatus from './routes/getTaskStatus.js';
import loggerHandler from './middlewares/loggerHandler.js';
import { loggerManager } from './logger.js';
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

const internalHttp = express();
const externalHttp = express();

externalHttp
    .use(express.json())
    .use(loggerHandler(loggerManager.getLogger('externalHttp')))
    .post(createTaskPath, createTask(createTaskWorkerUrl))
    .get(getTaskStatusPath, getTaskStatus)
    .use(errorHandler(loggerManager.getLogger('externalHttpErrors')));

internalHttp
    .use(express.json())
    .use(loggerHandler(loggerManager.getLogger('internalHttp')))
    .patch(updateTaskStatusPath, updateTaskStatus)
    .use(errorHandler(loggerManager.getLogger('internalHttpErrors')));

externalHttp.listen(Number(EXTERNAL_MANAGER_PORT!), () => { });
internalHttp.listen(Number(INTERNAL_MANAGER_PORT!), () => { });
