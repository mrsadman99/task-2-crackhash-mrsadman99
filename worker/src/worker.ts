import { AlphabetHandler, WordsGeneratorType } from './alphabetHandler.js';
import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';
import { createHash } from 'crypto';
import { taskLogger } from './logger.js';

type WorkerDataType = {
    updateTaskStatusUrl: string;
    partNumber: number;
    partCount: number;
    requestId: string;
    hash: string;
    maxLength: number;
};
const workerTypedData: WorkerDataType = workerData;

interface IWorker {
    execute(): Promise<boolean>;
}

class Worker implements IWorker {
    /**
     * Executes iterating over words pool to find encoded word
     * @param updateTaskStatusUrl URL to update task status
     * @param partNumber worker number
     * @param partCount amount of parts which will execute by workers
     * @param requestId Task ID
     * @param hash MD5 hash encoded word
     * @param maxLength maximum amount of symbols in encoded word
     */
    execute(): Promise<boolean> {
        const {
            updateTaskStatusUrl,
            partNumber,
            partCount,
            requestId,
            hash,
            maxLength,
        } = workerTypedData;
        const data = this.crackHash(partNumber, partCount, requestId, hash, maxLength);

        if (data) {
            return this.sendUpdatedStatus(updateTaskStatusUrl, requestId, data);
        }
        return Promise.resolve(false);
    }

    protected crackHash(
        partNumber: number,
        partCount: number,
        requestId: string,
        hash: string,
        maxLength: number) {
        const taskMetadata = {
            requestId,
            hash,
            maxLength,
            partCount,
            partNumber,
        };
        const wordsGenerator = this.createTask(partCount, partNumber, maxLength, taskMetadata);

        for (const { word, nextWordsLength } of wordsGenerator) {
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
        }
    }

    protected createTask(
        partNumber: number,
        partCount: number, maxLength: number,
        taskMetadata: { requestId: string },
    ): Generator<WordsGeneratorType> {
        // Creates object in async way
        const alphabetHandler = new AlphabetHandler(maxLength, partCount, partNumber);
        const alphabetIterator = alphabetHandler.getWordsIterator();

        const logMessage = `${taskMetadata.requestId} Created task with following parameters: ${JSON.stringify(taskMetadata, null, 2)}`;
        taskLogger.info(logMessage);

        return alphabetIterator;
    }

    protected async sendUpdatedStatus(updateTaskStatusUrl: string, requestId: string, data: string): Promise<boolean> {
        try {
            const result = await axios.patch(updateTaskStatusUrl, {
                requestId,
                data,
            });
            return result.status === 200;
        } catch {
            return false;
        }
    }
}

new Worker().execute().then((result) => parentPort?.postMessage({result}));
