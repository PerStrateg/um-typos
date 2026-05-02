import phrases from "../../../data/ru/phrases.json";
import replacements from "../../../data/ru/replacements.json";
import misspellings from "../../../data/ru/misspellings.json";
import regexRules from "../../../data/ru/regex-rules.json";
import insertions from "../../../data/ru/insertions.json";
import numbers from "../../../data/ru/numbers.json";
import emoji from "../../../data/ru/emoji.json";
import languageHints from "../../../data/ru/language-hints.json";
import morphology from "../../../data/ru/morphology.json";
import { createIntlSegmenterAdapter } from "../../adapters/intlSegmenter.js";
import { createRuCompromiseAdapter } from "../../adapters/ruCompromise.js";
import {
   dictionaryReplacementFilter,
   emojiFilter,
   misspellingFilter,
   numberSimplificationFilter,
   phraseInsertionFilter,
   phraseReplacementFilter
} from "../../filters/index.js";
import type { DictionaryData, EmojiData, InsertionData, LanguageHints, LanguagePack, NumberData, RegexRulesData } from "../../core/types.js";

export const russianPack: LanguagePack = {
   code: "ru",
   aliases: ["rus"],
   segmenter: createIntlSegmenterAdapter("ru"),
   nlp: createRuCompromiseAdapter(),
   dictionaries: {
      phrases: phrases as DictionaryData,
      replacements: replacements as DictionaryData,
      misspellings: misspellings as DictionaryData,
      insertions: insertions as InsertionData,
      numbers: numbers as NumberData,
      emoji: emoji as EmojiData,
      morphology
   },
   filters: [
      phraseReplacementFilter,
      dictionaryReplacementFilter,
      numberSimplificationFilter,
      misspellingFilter,
      phraseInsertionFilter,
      emojiFilter
   ],
   rules: {
      regexRules: regexRules as RegexRulesData,
      languageHints: languageHints as LanguageHints
   }
};
