// LICENSE : MIT
"use strict";
const isCapitalized = require('is-capitalized');
const includes = require('array-includes');
const AcronymJoiningWords = [
    "of",
    "the",
    "for",
    "in",
    "and",
    "or",
    "&"
];
function isAllCapitals(word) {
    return /^[A-Z]+$/.test(word);
}


function expandOneWordToAcronym(CapitalWord) {
    let acronym = CapitalWord.charAt(0);
    let restWord = CapitalWord.slice(1);
    let lastCapitalChar = null;
    for (let i = 0; i < restWord.length; i++) {
        const char = restWord.charAt(i);
        if (/[A-Z]/.test(char)) {
            lastCapitalChar = char;
        } else {
            if (lastCapitalChar) {
                acronym += lastCapitalChar;
                lastCapitalChar = null;
            }
        }
    }
    return acronym;
}
/*
 * create Acronym from words.
 * @param words
 * @returns {string}
 * @example XMLHttpRequest -> XHR
 * @example World Health Organization -> WHO
 */
function expandWordsToAcronym(words) {
    if (words.length === 1) {
        return expandOneWordToAcronym(words[0]);
    }
    // World Health Organization -> WHO
    return words.reduce((acronym, word) => {
        acronym += word.charAt(0);
        return acronym;
    }, "");
}

class AcronymCreator {
    constructor() {
        this._wordQueue = [];
    }

    addWord(word) {
        this._wordQueue.push(word);
    }

    canExtractAcronym() {
        return this._wordQueue.length > 0;
    }

    extractAcronym() {
        const acronym = expandWordsToAcronym(this._wordQueue);
        this.clear();
        return acronym;
    }

    clear() {
        this._wordQueue = [];
    }
}

const defaultOptions = {
    min_acronym_len: 3
};
export default function (context, options) {
    const minAcronymLength = options.min_acronym_len || defaultOptions.min_acronym_len;
    const {Syntax, RuleError, report, getSource} = context;
    // pickup acronyms
    const acronymList = [];
    // original words in document
    const expandedAcronymList = [];
    return {
        [Syntax.Str](node){
            const text = getSource(node);
            const words = text.split(/\b/);
            const acronymCreator = new AcronymCreator();
            words.forEach(word => {
                if (word.trim().length === 0) {
                    return
                }
                if (isAllCapitals(word)) {
                    // collect Acronym
                    if (word.length >= minAcronymLength && !includes(acronymList, word)) {
                        acronymList.push(word);
                    }
                } else if (isCapitalized(word)) {
                    // Add temporarySequence
                    // => add temp [word]
                    acronymCreator.addWord(word);

                } else if (!includes(AcronymJoiningWords, word) // ignore of and...
                    && acronymCreator.canExtractAcronym()) {
                    // Create Acronym
                    var acronym = acronymCreator.extractAcronym();
                    if (acronym.length >= minAcronymLength) {
                        expandedAcronymList.push(acronym);
                    }
                }
            });
            if (acronymCreator.canExtractAcronym()) {
                // Create Acronym
                var acronym = acronymCreator.extractAcronym();
                if (acronym.length >= minAcronymLength) {
                    expandedAcronymList.push(acronym);
                }
            }
        },
        [Syntax.Document + ":exit"](node){
            acronymList.forEach(acronym => {
                // not found acronym in document
                if (!includes(expandedAcronymList, acronym)) {
                    report(node, new RuleError(`"${acronym}" is unexpanded acronym. Not found words that is expanded of "${acronym}" in the document.`));
                }
            });
        }
    }
}