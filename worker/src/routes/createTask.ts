import { Request, Response } from 'express';
import { getWorker } from '../worker.js';

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

        getWorker().execute(updateTaskStatusUrl, 1, 1, requestId, hash, maxLength);

        res.sendStatus(200);
    }
};
