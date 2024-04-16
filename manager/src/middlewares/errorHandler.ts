import { Request, Response } from 'express';
import { Logger } from 'winston';

export default (logger: Logger) => (err: Error, req: Request, res: Response) => {
    const msg = `${req.method} ${req.hostname} ${req.path}`;
    logger.error(msg, { message: err.message });
    res.status(500).send(err.message);
};
