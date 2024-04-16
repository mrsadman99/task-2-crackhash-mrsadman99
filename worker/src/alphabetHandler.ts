type WordsByLength = { [key: number]: number };
type WordsGeneratorType = { word: string; nextWordsLength: boolean };


const getAlphabet = (): string[] => {
    const latinSymbolsOffset = 97;
    const latinAlphabetCount = 26;
    const alphabet = [];
    for (const index of Array(latinAlphabetCount + 10).keys()) {
        if (index < latinAlphabetCount) {
            alphabet.push(String.fromCharCode(index + latinSymbolsOffset));
        } else {
            alphabet.push(String(index - latinAlphabetCount));
        }
    }

    return alphabet;
};

class AlphabetHandler {
    protected alphabet: string[];
    protected wordsCount: number = 0;
    protected currentWordByAlphabetArray: number[] = [];

    constructor(
        maxLength: number,
        partCount: number,
        partNumber: number,
    ) {
        this.alphabet = getAlphabet();
        const wordsCountByLength = this.getWordsCountByLength(maxLength);
        this.setStartedPosition(wordsCountByLength, maxLength, partCount, partNumber);
    }

    /**
     * function generator which iterate over alphabet array and build words
     */
    *getWordsIterator(): Generator<WordsGeneratorType> {
        yield { word: this.buildCurrentWord(), nextWordsLength: false };

        for (let wordIndex = 1; wordIndex < this.wordsCount; wordIndex++) {
            yield this.nextWord();
        }
    }

    /**
     * Reverses array of symbols to correct way from left to right and build current word
     * */
    buildCurrentWord() {
        return Array.from(this.currentWordByAlphabetArray)
            .reverse()
            .map(alphabetIndex => this.alphabet[alphabetIndex])
            .join('');
    }

    private nextWord(): WordsGeneratorType {
        let nextWordsLength = false;
        // Retrieves word symbol which will change to next alphabet symbol
        let index = this.currentWordByAlphabetArray.findIndex(alphabetIndex => alphabetIndex + 1 < this.alphabet.length);

        if (index === -1) {
            index = this.currentWordByAlphabetArray.length;
            this.currentWordByAlphabetArray.push(0);
            nextWordsLength = true;
        } else {
            this.currentWordByAlphabetArray[index]++;
        }
        // sets 0 index of alphabet symbol to all word letters right from letter with position {index}
        for (let zeroAlphabetIndex = 0; zeroAlphabetIndex < index; zeroAlphabetIndex++) {
            this.currentWordByAlphabetArray[zeroAlphabetIndex] = 0;
        }

        return { word: this.buildCurrentWord(), nextWordsLength };
    }

    /**
     * Gets map of words count in any combination from alphabet symbols range 1 to i words length,
     * where i is key of map
     * @param maxLength
     * @returns
     */
    private getWordsCountByLength(maxLength: number): WordsByLength {
        const alphabetCount = this.alphabet.length;
        // Amount of words in combination from 1 to i length words, where i is key of map
        const wordsCountByLength: WordsByLength = {
            1: alphabetCount,
        };
        for (let i = 2; i <= maxLength; i++) {
            wordsCountByLength[i] = wordsCountByLength[i - 1] + Math.pow(alphabetCount, i);
        }
        return wordsCountByLength;
    }

    /**
    * Sets started position fields for worker words iteration
    * @param {string[]} wordsCountByLength map with words count from 1 to n symbols in words where n is key of map
    * @param {number} maxLength maximum length of words
    * @param {number} partCount amount of workers
    * @param {number} partNumber worker number
   */
    private setStartedPosition(wordsCountByLength: WordsByLength, maxLength: number, partCount: number, partNumber: number) {
        const wordsCount = wordsCountByLength[maxLength];
        let wordsCountByWorker = Math.floor(wordsCount / partCount);
        if (partCount === partNumber) {
            wordsCountByWorker += wordsCount % partCount;
        }

        // words count offset for worker words pool
        const globalOffset = Math.floor(wordsCount / partCount) * (partNumber - 1);

        // Get start words length for worker
        const startPosition = Object.entries(wordsCountByLength)
            .find(([, wordsCountByLength]) => globalOffset < wordsCountByLength)!;
        const startWordsLength = Number(startPosition[0]);

        let localOffset = 0;
        if (globalOffset > 0 && startWordsLength > 1) {
            localOffset = globalOffset - wordsCountByLength[startWordsLength - 1];
        }

        this.wordsCount = wordsCountByWorker;
        this.setStartedWordByAlphabetArray(localOffset, startWordsLength);
    }

    private setStartedWordByAlphabetArray(localOffset: number, startWordsLength: number): void {
        const wordByAlphabetArray = [];
        const alphabetLength = this.alphabet.length;
        let offset = localOffset;

        for (let index = 0; index < startWordsLength; index++) {
            wordByAlphabetArray.push(offset % alphabetLength);
            offset = Math.floor(offset / alphabetLength);
        }

        this.currentWordByAlphabetArray = wordByAlphabetArray;
    }

}

export { WordsGeneratorType, AlphabetHandler };
