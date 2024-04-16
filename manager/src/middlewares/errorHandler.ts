import { NextFunction, Request, Response } from 'express';
import log4js from 'log4js';

export default (logger: log4js.Logger) => (err: Error, req: Request, res: Response, _: NextFunction) => {
    logger.error(err);
    const msg = `${req.method} ${req.hostname} ${req.path}`;
    logger.error(msg, { message: err.message });
    res.status(500).send(err.message);
};
