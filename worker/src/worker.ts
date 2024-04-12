import AlphabetHandler from './alphabetHandler.js';
import axios from 'axios';
import { createHash } from 'crypto';

type WordsByLength = { [key: number]: number };

interface IWorker {
    execute(
        updateTaskStatusUrl: string,
        partNumber: number,
        partCount: number,
        requestId: string,
        hash: string,
        maxLength: number,
    ): Promise<void>;
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
    execute(
        updateTaskStatusUrl: string,
        partNumber: number,
        partCount: number,
        requestId: string,
        hash: string,
        maxLength: number,
    ): Promise<void> {
        return new Promise((resolve) => {
            const wordsCountByLength = this.getWordsCountByLength(maxLength);
            const alphabetHandler = new AlphabetHandler(wordsCountByLength, maxLength, partCount, partNumber);
            const alphabetIterator = alphabetHandler.getWordsIterator();

            for (const word of alphabetIterator) {
                const currentHash = createHash('md5').update(word).digest('hex');

                if (currentHash === hash) {
                    axios.patch(updateTaskStatusUrl, {
                        requestId,
                        data: word,
                    });
                    resolve();
                }
            }
        });
    }

    /**
     * Gets map of words count in any combination from alphabet symbols range 1 to i words length,
     * where i is key of map
     * @param maxLength
     * @returns
     */
    private getWordsCountByLength(maxLength: number): WordsByLength {
        const alphabetCount = AlphabetHandler.getAlphabet().length;
        // Amount of words in combination from 1 to i length words, where i is key of map
        const wordsCountByLength: WordsByLength = {
            1: alphabetCount,
        };
        for (let i = 2; i <= maxLength; i++) {
            wordsCountByLength[i] = wordsCountByLength[i - 1] + Math.pow(alphabetCount, i);
        }

        return wordsCountByLength;
    }
}

let worker: IWorker | null;

const getWorker = (): IWorker => {
    if (!worker) {
        worker = new Worker();
    }
    return worker;
};

export { Worker, IWorker, getWorker };
