import { Request, Response } from 'express';
import { Worker } from 'worker_threads';

type CreateTaskRequest = {
    requestId: string;
    hash: string;
    maxLength: number;
};

export default (updateTaskStatusUrl: string) => (req: Request<null, string | null, CreateTaskRequest>, res: Response) => {
    const { body } = req;
    if (!body || !body.hash || !body.maxLength || !body.requestId) {
        res.status(400).send('Invalid body format');
    } else {
        const { requestId, hash, maxLength } = body;

        new Worker('./worker.js', {
            workerData: {
                updateTaskStatusUrl,
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
