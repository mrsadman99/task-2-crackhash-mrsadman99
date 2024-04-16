import { NextFunction, Request, Response } from 'express';
import { httpErrorsLogger } from '../logger.js';

export default (err: Error, req: Request, res: Response, _: NextFunction) => {
    const msg = `${req.method} ${req.hostname} ${req.path}`;
    httpErrorsLogger.error(msg, { message: err.message });
    res.status(500).send(err.message);
};
