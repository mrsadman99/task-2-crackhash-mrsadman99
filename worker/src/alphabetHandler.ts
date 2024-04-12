type WordsByLength = { [key: number]: number };

export default class AlphabetHandler {
    protected alphabet: string[];
    protected wordsCount: number = 0;
    protected localOffset: number = 0;
    protected startWordsLength: number = 0;

    constructor(
        wordsCountByLength: WordsByLength,
        maxLength: number,
        partCount: number,
        partNumber: number,
    ) {
        this.alphabet = AlphabetHandler.getAlphabet();
        this.setStartedPosition(wordsCountByLength, maxLength, partCount, partNumber);
    }

    static getAlphabet(): string[] {
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
    }

    /**
     * function generator which iterate over alphabet array and build words
     */
    * getWordsIterator() {
        const alphabetLength = this.alphabet.length;
        const currentWordByAlphabetArray = this.getStartedWordByAlphabetArray();

        // reverse array of symbols to correct way from left to right and build string
        const getWord = () =>
            Array.from(currentWordByAlphabetArray)
                .reverse()
                .map(alphabetIndex => this.alphabet[alphabetIndex])
                .join('');

        yield getWord();

        for (let wordIndex = 1; wordIndex < this.wordsCount; wordIndex++) {
            // Retrieves word symbol which will change to next alphabet symbol
            let index = currentWordByAlphabetArray.findIndex(alphabetIndex => alphabetIndex + 1 < alphabetLength);

            if (index === -1) {
                index = currentWordByAlphabetArray.length;
                currentWordByAlphabetArray.push(0);
            } else {
                currentWordByAlphabetArray[index]++;
            }
            // sets 0 index of alphabet symbol to all word letters right from letter with position {index}
            for (let zeroAlphabetIndex = 0; zeroAlphabetIndex < index; zeroAlphabetIndex++) {
                currentWordByAlphabetArray[zeroAlphabetIndex] = 0;
            }

            yield getWord();
        }
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

        this.localOffset = localOffset;
        this.startWordsLength = startWordsLength;
        this.wordsCount = wordsCountByWorker;
    }

    private getStartedWordByAlphabetArray(): number[] {
        const wordByAlphabetArray = [];
        const alphabetLength = this.alphabet.length;
        let offset = this.localOffset;

        for (let index = 0; index < this.startWordsLength; index++) {
            wordByAlphabetArray.push(offset % alphabetLength);
            offset = Math.floor(offset / alphabetLength);
        }

        return wordByAlphabetArray;
    }

}
