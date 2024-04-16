import { NextFunction, Request, Response } from 'express';
import { getManager } from '../manager.js';

type CreateTaskResponse = { requestId: string } | string;
type CreateTaskRequest = {
    hash: string;
    maxLength: number;
};

export default (createTaskWorkerUrl: string) => async (req: Request<null, CreateTaskResponse, CreateTaskRequest>, res: Response<CreateTaskResponse>, next: NextFunction) => {
    const { body } = req;
    if (!body || !body.hash || !body.maxLength) {
        res.status(400).send('Invalid body format');
    } else {
        const { hash, maxLength } = body;
        try {
            const createTaskResult = await getManager().createTask(createTaskWorkerUrl, hash, maxLength);
            if (!createTaskResult) {
                next(Error(`Failed to post task: { hash: ${hash}, maxLength: ${maxLength}}`));
            } else {
                const { result, ...taskState } = createTaskResult;
                if (result === 'EXIST') {
                    res.status(200).send(`Task was create earlier: ${JSON.stringify(taskState)}`);
                } else {
                    res.status(201).json({ requestId: createTaskResult.requestId });
                }
            }
        } catch (err) {
            next(err);
        }
    }
};
