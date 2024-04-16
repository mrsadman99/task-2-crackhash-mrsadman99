import { NextFunction, Request, Response } from 'express';
import log4js from 'log4js';

export default (logger: log4js.Logger) => (req: Request, _: Response, next: NextFunction) => {
    let msg = `${req.method} ${req.hostname} ${req.path}`;
    if (req.body) {
        msg += ` body: ${JSON.stringify(req.body)}`;
    }
    logger.info(msg);
    next();
};
