import 'dotenv/config';

import createTask from './routes/createTask.js';
import errorHandler from './middlewares/errorHandler.js';
import express from 'express';
import getTaskStatus from './routes/getTaskStatus.js';
import loggerHandler from './middlewares/loggerHandler.js';
import { loggerManager } from './logger.js';

const { EXTERNAL_MANAGER_PORT } = process.env;

const CREATE_TASK_PATH = '/api/hash/crack';
const GET_STATUS_TASK_PATH = '/api/hash/status/:requestId';

const externalHttp = express();

externalHttp
    .use(express.json())
    .use(loggerHandler(loggerManager.getLogger('externalHttp')))
    .post(CREATE_TASK_PATH, createTask)
    .get(GET_STATUS_TASK_PATH, getTaskStatus)
    .use(errorHandler(loggerManager.getLogger('externalHttpErrors')));

externalHttp.listen(Number(EXTERNAL_MANAGER_PORT!), () => { });
