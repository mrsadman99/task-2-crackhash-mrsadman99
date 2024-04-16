import { NextFunction, Request, Response } from 'express';
import { getManager } from '../manager.js';

export default (req: Request, res: Response, next: NextFunction) => {
    const { requestId } = req.params;
    let taskStatus = null;
    if (!requestId || typeof requestId !== 'string') {
        res.status(400).send('Invalid requestId format');
    } else {
        try {
            taskStatus = getManager().getTaskStatus(requestId);
            if (!taskStatus) {
                next(Error(`Couldn't find task status for requestId: ${requestId}`));
            }
        } catch (err) {
            next(err);
        }
    }

    res.status(200).json(taskStatus);
};
