import 'dotenv/config';
import { getWorkerManager } from './workerManager.js';
import { logger } from './logger.js';

getWorkerManager().init().then(() => {
    logger.info('Succesfully initialized worker manager');
});
