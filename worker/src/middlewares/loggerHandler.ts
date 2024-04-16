import { NextFunction, Request, Response } from 'express';
import { apiLogger } from '../logger.js';

export default (req: Request, _: Response, next: NextFunction) => {
    let msg = `${req.method} ${req.hostname} ${req.path}`;
    if (req.body) {
        msg += ` body: ${JSON.stringify(req.body)}`;
    }
    apiLogger.info(msg);
    next();
};
