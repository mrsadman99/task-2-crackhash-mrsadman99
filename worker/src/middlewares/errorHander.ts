import { Request, Response } from 'express';
import { logger } from '../logger.js';

export default (err: Error, req: Request, res: Response) => {
    const date = new Date(Date.now()).toString();
    const msg = `${req.method} ${req.hostname} ${req.path} ${date}`;
    logger.error(msg, { message: err.message });
    res.status(500).send('Internal server error');
};
