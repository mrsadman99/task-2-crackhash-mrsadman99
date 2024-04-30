import { AlphabetHandler, WordsGeneratorType } from './alphabetHandler.js';
import { parentPort, workerData } from 'worker_threads';
import { createHash } from 'crypto';
import { errorLogger, taskLogger } from './logger.js';

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

        const wordsGenerator = this.createTask(partCount, partNumber, maxLength, workerTypedData);

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

        try {
            for await (const { word, nextWordsLength } of wordsGenerator) {
                const data = await new Promise<string | null>((resolve) => {
                    setTimeout(() => resolve(iterate(word, nextWordsLength)), 0);
                });
                if (data) {
                    return data;
                }
            }
        } catch(err) {
            errorLogger.error(err);
        }

        return null;
    }

    protected createTask(
        partNumber: number,
        partCount: number, maxLength: number,
        taskMetadata: { requestId: string },
    ): AsyncGenerator<WordsGeneratorType> {
        // Creates object in async way
        const alphabetHandler = new AlphabetHandler(maxLength, partCount, partNumber);
        const alphabetIterator = alphabetHandler.getWordsIterator();

        taskLogger.addContext('requestId', taskMetadata.requestId);
        const logMessage = `${taskMetadata.requestId} Created task with following parameters: ${JSON.stringify(taskMetadata, null, 2)}`;
        taskLogger.info(logMessage);

        return alphabetIterator;
    }
}

new Worker().crackHash().then(result => {
    parentPort?.postMessage(result);
});
