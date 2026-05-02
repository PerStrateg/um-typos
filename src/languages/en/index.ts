import phrases from "../../../data/en/phrases.json";
import replacements from "../../../data/en/replacements.json";
import misspellings from "../../../data/en/misspellings.json";
import regexRules from "../../../data/en/regex-rules.json";
import insertions from "../../../data/en/insertions.json";
import numbers from "../../../data/en/numbers.json";
import emoji from "../../../data/en/emoji.json";
import languageHints from "../../../data/en/language-hints.json";
import morphology from "../../../data/en/morphology.json";
import { createCompromiseAdapter } from "../../adapters/compromise.js";
import { createIntlSegmenterAdapter } from "../../adapters/intlSegmenter.js";
import {
   dictionaryReplacementFilter,
   emojiFilter,
   misspellingFilter,
   numberSimplificationFilter,
   phraseInsertionFilter,
   phraseReplacementFilter
} from "../../filters/index.js";
import type { DictionaryData, EmojiData, InsertionData, LanguageHints, LanguagePack, NumberData, RegexRulesData } from "../../core/types.js";

export const englishPack: LanguagePack = {
   code: "en",
   aliases: ["eng"],
   segmenter: createIntlSegmenterAdapter("en"),
   nlp: createCompromiseAdapter(),
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
