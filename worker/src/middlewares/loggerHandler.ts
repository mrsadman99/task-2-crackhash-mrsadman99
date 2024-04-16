import { NextFunction, Request, Response } from 'express';
import { httpLogger } from '../logger.js';

export default (req: Request, _: Response, next: NextFunction) => {
    let msg = `${req.method} ${req.hostname} ${req.path}`;
    if (req.body) {
        msg += ` body: ${JSON.stringify(req.body)}`;
    }
    httpLogger.info(msg);
    next();
};
