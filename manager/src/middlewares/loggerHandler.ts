import { NextFunction, Request, Response } from 'express';
import { Logger } from 'winston';

export default (logger: Logger) => (req: Request, _: Response, next: NextFunction) => {
    let msg = `${req.method} ${req.hostname} ${req.path}`;
    if (req.body) {
        msg += ` body: ${JSON.stringify(req.body)}`;
    }
    logger.info(msg);
    next();
};
