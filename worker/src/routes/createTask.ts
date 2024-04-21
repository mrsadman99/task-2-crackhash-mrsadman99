import { Request, Response } from 'express';
import { Worker } from 'worker_threads';

type CreateTaskRequest = {
    requestId: string;
    hash: string;
    maxLength: number;
};
const {
    INTERNAL_MANAGER_HOST,
    INTERNAL_MANAGER_PORT,
} = process.env;
const UPDATE_TASK_STATUS_URL = `http://${INTERNAL_MANAGER_HOST}:${INTERNAL_MANAGER_PORT}/internal/api/manager/hash/crack/request`;

export default (req: Request<null, string | null, CreateTaskRequest>, res: Response) => {
    const { body } = req;
    if (!body || !body.hash || !body.maxLength || !body.requestId) {
        res.status(400).send('Invalid body format');
    } else {
        const { requestId, hash, maxLength } = body;

        new Worker('./dist/worker.js', {
            workerData: {
                updateTaskStatusUrl: UPDATE_TASK_STATUS_URL,
                partNumber: 1,
                partCount: 1,
                requestId,
                hash,
                maxLength,
            },
        });

        res.sendStatus(200);
    }
};
