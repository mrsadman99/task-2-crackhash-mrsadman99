import 'dotenv/config';

import errorHandler from './middlewares/errorHandler.js';
import express from 'express';
import loggerHandler from './middlewares/loggerHandler.js';
import { readFile } from 'fs/promises'
import { Worker } from 'worker_threads';

const {
    WORKER_PORT,
    INTERNAL_MANAGER_HOST,
    INTERNAL_MANAGER_PORT,
} = process.env;

const createTaskPath = '/internal/api/worker/hash/crack/task';
const updateTaskStatusUrl = `http://${INTERNAL_MANAGER_HOST}:${INTERNAL_MANAGER_PORT}/internal/api/manager/hash/crack/request`;

const workerApi = express();

// workerApi
//     .use(express.json())
//     .use(loggerHandler)
//     .post(createTaskPath, createTask(updateTaskStatusUrl))
//     .use(errorHandler)
//     .listen(Number(WORKER_PORT!), () => { });

const createTask = (requestId: string, hash: string, maxLength: number) => {
    new Worker('./dist/worker.js', {
        workerData: {
            updateTaskStatusUrl: '',
            partNumber: 1,
            partCount: 1,
            requestId,
            hash,
            maxLength,
        },
    });

};

createTask('1', 'f08d6ddd0546cff9dc7b0254ec274098', 7);
createTask('2', 'f08d6ddd0546cff9dc7b0254ec274098', 5);
createTask('3', 'f08d6ddd0546cff9dc7b0254ec274098', 6);
