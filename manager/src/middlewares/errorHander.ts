import { Request, Response } from 'express';
import { Logger } from 'winston';

export default (logger: Logger) => (err: Error, req: Request, res: Response) => {
    const date = new Date(Date.now()).toString();
    const msg = `${req.method} ${req.hostname} ${req.path} ${date}`;
    logger.error(msg, { message: err.message });
    res.status(500).send(err.message);
};
