import 'dotenv/config';

import createTask from './routes/createTask.js';
import errorHandler from './middlewares/errorHandler.js';
import express from 'express';
import loggerHandler from './middlewares/loggerHandler.js';

const { WORKER_PORT } = process.env;
const createTaskPath = '/internal/api/worker/hash/crack/task';

const workerApi = express();

workerApi
    .use(express.json())
    .use(loggerHandler)
    .post(createTaskPath, createTask)
    .use(errorHandler)
    .listen(Number(WORKER_PORT!), () => { });
