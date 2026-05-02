import { classifyLanguageWord, getLanguageWords } from "../../languages/registry.js";
import { pickDictionarySpelling } from "../shared/dictionary.js";
import {
   maybeReplace,
   pickRandom,
   prependAfterWhitespace,
   replaceSentences,
   replaceWholePhrase,
   restoreCase,
   simplifyNumber,
   splitOuterWhitespace
} from "../shared/text.js";
import { EN_BIMBOFY_DATA } from "./data/en.js";
import { RU_BIMBOFY_DATA } from "./data/ru.js";
import { UNIVERSAL_BIMBOFY_DATA } from "./data/universal.js";

export const bimbofyFilter = {
   id: "bimbofy",
   label: "Bimbofy",
   defaultSettings: {
      intensity: 1,
      phrases: true,
      sentenceFillers: true,
      numbers: true,
      dictionary: true,
      typoRules: true
   },
   controls: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "phrases", label: "Phrase swaps", type: "checkbox" },
      { key: "sentenceFillers", label: "Sentence fillers", type: "checkbox" },
      { key: "numbers", label: "Number fuzzing", type: "checkbox" },
      { key: "dictionary", label: "Dictionary words", type: "checkbox" },
      { key: "typoRules", label: "Typo rules", type: "checkbox" }
   ],
   data: {
      en: EN_BIMBOFY_DATA,
      ru: RU_BIMBOFY_DATA,
      universal: UNIVERSAL_BIMBOFY_DATA
   },
   transformText
};

// Runs the bimbofy-style typo, filler, phrase, and number transformations.
export function transformText(text, context) {
   let { leading, body, trailing } = splitOuterWhitespace(text);
   if (!body) return text;

   let output = context.data.universalPerturb
      ? runUniversalPerturb(body, context)
      : runLanguageBimbofy(body, context);

   return leading + output + trailing;
}

function runLanguageBimbofy(text, context) {
   let output = context.data.normalizeQuotes
      ? text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      : text;

   if (context.filterSettings.phrases) {
      output = phraseStage(output, context);
   }
   if (context.filterSettings.sentenceFillers) {
      output = sentenceStage(output, context);
   }
   if (context.filterSettings.numbers) {
      output = numberStage(output, context);
   }
   output = wordStage(output, context);

   return output;
}

function runUniversalPerturb(text, context) {
   let output = context.filterSettings.numbers ? numberStage(text, context) : text;
   let wordPattern = context.languageData.patterns.word;

   return output.replace(wordPattern, (word) => {
      if (!context.filterSettings.typoRules || context.random() >= context.intensity * context.data.wordTransform.perturbProbability) {
         return word;
      }

      return perturbWord(word, context);
   });
}

function phraseStage(text, context) {
   let output = text;

   for (let entry of context.data.phrases || []) {
      if (context.random() >= context.intensity * entry.probability) continue;
      output = replaceWholePhrase(output, entry.phrase, pickRandom(entry.replacements, context));
   }

   return output;
}

function sentenceStage(text, context) {
   let sentenceData = context.data.sentence;
   if (!sentenceData) return text;

   return replaceSentences(text, (body, punctuation) => {
      let words = getLanguageWords(body, context.languageData);
      if (words.length < sentenceData.minWords) return body + punctuation;

      let output = body;
      for (let insertion of sentenceData.insertions || []) {
         if (words.length < (insertion.minWords || 0)) continue;
         if (context.random() >= context.intensity * insertion.probability) continue;

         let value = pickRandom(insertion.values, context);
         output = applySentenceInsertion(output, value, insertion, context);
      }

      return output + punctuation;
   });
}

function applySentenceInsertion(text, value, insertion, context) {
   if (insertion.position === "tail") {
      return text + " " + value;
   }

   if (insertion.position === "prefix") {
      return prependAfterWhitespace(text, value);
   }

   if (insertion.position === "beforeWord") {
      return insertBeforeWord(text, value, insertion.minWordLength || 1, context);
   }

   if (insertion.position === "beforeTag") {
      return insertNearTaggedWord(text, insertion.tag, value, "before", context);
   }

   if (insertion.position === "afterTag") {
      return insertNearTaggedWord(text, insertion.tag, value, "after", context);
   }

   return text;
}

function numberStage(text, context) {
   return text.replace(/\b\d{2,}\b/g, (rawNumber) => {
      return simplifyNumber(rawNumber, context, context.data.numberLabels || {});
   });
}

function wordStage(text, context) {
   let wordPattern = context.languageData.patterns.word;

   return text.replace(wordPattern, (originalWord) => {
      if (originalWord.length < 2) return originalWord;

      let lowerWord = originalWord.toLocaleLowerCase();
      let transformedWord = lowerWord;
      let usedDictionary = false;

      if (context.filterSettings.dictionary && context.random() < context.intensity * context.data.wordTransform.dictionaryProbability) {
         let dictionarySpelling = pickLanguageSpelling(lowerWord, context);
         usedDictionary = dictionarySpelling !== null && dictionarySpelling !== lowerWord;
         transformedWord = dictionarySpelling || lowerWord;
      }

      if (context.filterSettings.typoRules && !usedDictionary && context.random() < context.intensity * context.data.wordTransform.ruleProbability) {
         transformedWord = misspellByRule(transformedWord, context);
      }

      return restoreCase(originalWord, transformedWord);
   });
}

function pickLanguageSpelling(word, context) {
   let direct = pickDictionarySpelling(word, context.data.words || {}, context);
   if (direct) return direct;

   if (context.data.wordTransform.simplePlural && word.length > 3 && word.endsWith("s")) {
      let base = word.slice(0, -1);
      let baseSpelling = pickDictionarySpelling(base, context.data.words || {}, context);
      if (baseSpelling) {
         return preserveSimplePlural(baseSpelling, context);
      }
   }

   return null;
}

function misspellByRule(word, context) {
   let output = word;

   for (let rule of context.data.misspellRules || []) {
      output = maybeReplace(output, rule.pattern, rule.replacement, rule.probability, context);
   }

   if (context.data.wordTransform.collapseRepeatedLetters) {
      output = collapseRepeatedLetters(output, context);
   }

   return output;
}

function insertBeforeWord(text, insertedWord, minWordLength, context) {
   let inserted = false;
   return text.replace(context.languageData.patterns.word, (word) => {
      if (inserted || word.length < minWordLength) return word;
      inserted = true;
      return insertedWord + " " + word;
   });
}

function insertNearTaggedWord(text, tag, insertedWord, position, context) {
   let inserted = false;
   return text.replace(context.languageData.patterns.word, (word) => {
      if (inserted || classifyLanguageWord(word, context.languageData) !== tag) return word;
      inserted = true;
      return position === "before"
         ? insertedWord + " " + word
         : word + " " + insertedWord;
   });
}

function preserveSimplePlural(replacement, context) {
   let pattern = context.data.wordTransform.simplePluralReplacement;
   if (!pattern || !pattern.test(replacement)) return replacement;
   return replacement.endsWith("s") ? replacement : replacement + "s";
}

function collapseRepeatedLetters(word, context) {
   let output = "";
   let lastChar = "";
   let pattern = context.data.wordTransform.repeatedLetterPattern;

   for (let char of word) {
      if (char === lastChar && pattern.test(char)) {
         lastChar = char;
         continue;
      }

      lastChar = char;
      output += char;
   }

   return output;
}

function perturbWord(word, context) {
   let chars = Array.from(word);
   let settings = context.data.wordTransform;
   if (chars.length < settings.minWordLength) return word;

   let start = 1;
   let end = chars.length - 2;
   if (end <= start) return word;

   if (
      context.random() < settings.deleteProbability
      || chars.length < settings.swapMinWordLength
   ) {
      let index = start + Math.floor(context.random() * (end - start + 1));
      chars.splice(index, 1);
      return chars.join("");
   }

   let index = start + Math.floor(context.random() * Math.max(1, end - start));
   let next = index + 1;
   [chars[index], chars[next]] = [chars[next], chars[index]];
   return chars.join("");
}
