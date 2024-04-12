import { NextFunction, Request, Response } from 'express';
import { getManager } from '../manager.js';

type TaskPatchRequest = {
    requestId: string;
    data: string;
};

export default (req: Request<null, null | string, TaskPatchRequest>, res: Response, next: NextFunction) => {
    const { body } = req;
    if (!body.data || !body.requestId) {
        res.status(400).send('Invalid data to get request response');
    } else {
        const { data, requestId } = body;
        try {
            const result = getManager().saveTaskResult(requestId, data);
            if (result) {
                res.sendStatus(200);
            } else {
                throw Error(`Failed to update status for requestId: ${requestId}`);
            }
        } catch (err) {
            next(err);
        }
    }
};