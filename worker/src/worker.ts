import { errorLogger, logger, taskLogger } from './logger.js';
import { parentPort, workerData } from 'worker_threads';
import { AlphabetHandler } from './alphabetHandler.js';
import { createHash } from 'crypto';

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
            const alphabetHandler = this.createTask(
                partCount,
                partNumber,
                maxLength,
                workerTypedData,
            );
            const wordsGenerator = alphabetHandler.getWordsIterator();

            const iterate = (word: string, nextWordsLength: boolean) => {
                // Writes log message about iterated to next words length
                if (nextWordsLength) {
                    const logMessage = `${requestId} Iterated to next words length: ${word.length}`;
                    taskLogger.info(logMessage);
                }

                const currentHash = createHash('md5').update(word).digest('hex');

                if (currentHash === hash) {
                    const logMessage = `${requestId} Task completed, word: ${word}`;
                    taskLogger.info(logMessage);

                    return word;
                }

                return null;
            };

            timer = setInterval(
                () => taskLogger.info(`${requestId} task current state: ${JSON.stringify(alphabetHandler.state, null, 2)}`),
                LOG_TASK_INTERVAL,
            );

            for await (const { word, nextWordsLength } of wordsGenerator) {
                const data = await new Promise<string | null>((resolve) => {
                    setTimeout(() => resolve(iterate(word, nextWordsLength)), 0);
                });
                if (data) {
                    return data;
                }
            }
        } catch (err) {
            errorLogger.error(err);
        }

        return null;
    }

    protected createTask(
        partCount: number,
        partNumber: number,
        maxLength: number,
        taskMetadata: { requestId: string },
    ): AlphabetHandler {
        // Creates object in async way
        const alphabetHandler = new AlphabetHandler(maxLength, partCount, partNumber);
        const taskParams = { partNumber, partCount, ...alphabetHandler.state };

        taskLogger.info(`${taskMetadata.requestId} Created task with following parameters: ${JSON.stringify(taskParams, null, 2)}`);

        return alphabetHandler;
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
