import { createHash, randomUUID } from 'crypto';
import { errorLogger, logger, taskLogger } from './logger.js';
import { parentPort, workerData } from 'worker_threads';
import { AlphabetHandler } from './alphabetHandler.js';

/**
 * @param partNumber worker number
 * @param partCount amount of parts which will execute by workers
 * @param requestId Task ID
 * @param hash MD5 hash encoded word
 * @param maxLength maximum amount of symbols in encoded word
 */
type WorkerDataType = {
    partNumber: number;
    partCount: number;
    requestId: string;
    hash: string;
    maxLength: number;
};
const workerTypedData: WorkerDataType = workerData;

interface IWorker {
    crackHash(): void;
}

const LOG_TASK_INTERVAL = Number(process.env['LOG_TASK_INTERVAL_SECS']) * 1000;

let timer: NodeJS.Timeout;

class Worker implements IWorker {
    /**
     * Executes iterating over words pool to find encoded word
     */
    async crackHash(): Promise<string | null> {
        const {
            partNumber,
            partCount,
            requestId,
            hash,
            maxLength,
        } = workerTypedData;

        try {
            const { alphabetHandler, taskId } = this.createTask(
                partCount,
                partNumber,
                maxLength,
                workerTypedData,
            );
            const wordsGenerator = alphabetHandler.getWordsIterator();

            const iterate = (word: string) => {
                const currentHash = createHash('md5').update(word).digest('hex');

                if (currentHash === hash) {
                    const logMessage = `${taskId} completed, word: ${word}`;
                    taskLogger.info(logMessage);

                    return word;
                }

                return null;
            };

            timer = setInterval(
                () => taskLogger.info(`${taskId} current state: ${JSON.stringify({ ...alphabetHandler.state, requestId }, null, 2)}`),
                LOG_TASK_INTERVAL,
            );

            for await (const word of wordsGenerator) {
                const data = await new Promise<string | null>((resolve) => {
                    setTimeout(() => resolve(iterate(word)), 0);
                });
                if (data) {
                    return data;
                }
            }
            taskLogger.info(`${taskId} completed without data.`);

            return null;
        } catch (err) {
            errorLogger.error(err);
            return null;
        }
    }

    protected createTask(
        partCount: number,
        partNumber: number,
        maxLength: number,
        taskMetadata: { requestId: string },
    ): { taskId: string; alphabetHandler: AlphabetHandler } {
        // Creates object in async way
        const alphabetHandler = new AlphabetHandler(maxLength, partCount, partNumber);
        const taskParams = {
            partNumber,
            partCount,
            requestId: taskMetadata.requestId,
            ...alphabetHandler.state,
        };
        const taskId = randomUUID();

        taskLogger.info(`${taskId} created with following parameters: ${JSON.stringify(taskParams, null, 2)}`);

        return { taskId, alphabetHandler };
    }
}

// Stops worker if exit message posted from main
parentPort?.on('message', (msg) => {
    if (msg.exit && msg.requestId) {
        logger.info(`Stop task ${msg.requestId}`);
        clearTimeout(timer);
        process.exit(0);
    }
});

new Worker().crackHash().then(result => {
    clearTimeout(timer);
    parentPort?.postMessage(result);
});
