import { EN_LANGUAGE } from "./data/en.js";
import { RU_LANGUAGE } from "./data/ru.js";
import { UNIVERSAL_LANGUAGE } from "./data/universal.js";

const LANGUAGE_PROFILES = [
   EN_LANGUAGE,
   RU_LANGUAGE
];

const ALL_LANGUAGES = [
   ...LANGUAGE_PROFILES,
   UNIVERSAL_LANGUAGE
];

const LANGUAGE_BY_ID = new Map(ALL_LANGUAGES.map((language) => [language.id, language]));
const LANGUAGE_BY_ALIAS = new Map(
   ALL_LANGUAGES.flatMap((language) => {
      return language.aliases.map((alias) => [alias, language]);
   })
);

export const LANGUAGE_CHOICES = [
   { id: "auto", label: "Auto" },
   ...LANGUAGE_PROFILES.map((language) => ({ id: language.id, label: language.label })),
   { id: UNIVERSAL_LANGUAGE.id, label: UNIVERSAL_LANGUAGE.label }
];

// Resolves the global language once for the whole filter pipeline.
export function resolveLanguage(text, settings = {}) {
   if (settings.language && settings.language !== "auto") {
      return LANGUAGE_BY_ID.get(settings.language) || UNIVERSAL_LANGUAGE;
   }

   let pageLanguage = languageFromPage(settings.pageLanguage);
   if (pageLanguage) return pageLanguage;

   return detectLanguage(text);
}

// Returns registered language data, falling back to universal.
export function getLanguageData(languageId) {
   return LANGUAGE_BY_ID.get(languageId) || UNIVERSAL_LANGUAGE;
}

// Extracts words using the selected language's word pattern.
export function getLanguageWords(text, languageData) {
   return text.match(languageData.patterns.word) || [];
}

// Classifies a word for simple language-specific sentence insertion.
export function classifyLanguageWord(word, languageData) {
   if (languageData.id !== "ru") return "word";

   let lower = word.toLocaleLowerCase();
   if (languageData.nlp.nonVerbExceptions.has(lower)) return "word";
   if (languageData.patterns.verb.test(lower)) return "verb";
   if (languageData.patterns.adjective.test(lower)) return "adjective";
   if (
      languageData.patterns.adverb.test(lower)
      && lower.length >= languageData.nlp.minAdverbLength
   ) {
      return "adverb";
   }
   return "word";
}

function languageFromPage(pageLanguage) {
   if (!pageLanguage || typeof pageLanguage !== "string") return null;
   let alias = pageLanguage.trim().toLowerCase().split("-")[0];
   if (!alias) return null;
   return LANGUAGE_BY_ALIAS.get(alias) || UNIVERSAL_LANGUAGE;
}

function detectLanguage(text) {
   let bestLanguage = UNIVERSAL_LANGUAGE;
   let bestScore = 0;

   for (let language of LANGUAGE_PROFILES) {
      let score = detectLanguageScore(text, language);
      if (score > bestScore) {
         bestScore = score;
         bestLanguage = language;
      }
   }

   return bestScore >= 0.3 ? bestLanguage : UNIVERSAL_LANGUAGE;
}

function detectLanguageScore(text, language) {
   if (language.id === "en") return detectEnglish(text, language);
   if (language.id === "ru") return detectRussian(text, language);
   return 0;
}

function detectEnglish(text, language) {
   let latin = countMatches(text, language.patterns.latin);
   if (latin === 0) return 0;

   let cyrillic = countMatches(text, language.patterns.cyrillic);
   let words = text.toLowerCase().match(language.patterns.word) || [];
   let commonHits = words.filter((word) => language.detection.commonWords.has(word)).length;
   let commonBoost = Math.min(
      language.detection.maxCommonBoost,
      commonHits * language.detection.commonHitWeight
   );
   let lengthBoost = latin > language.detection.longTextMinLetters
      ? language.detection.longTextBoost
      : 0;
   let ratio = latin / (latin + cyrillic + 1);

   return ratio * (language.detection.baseScore + commonBoost + lengthBoost);
}

function detectRussian(text, language) {
   let cyrillic = countMatches(text, language.patterns.cyrillic);
   if (cyrillic === 0) return 0;

   let latin = countMatches(text, language.patterns.latin);
   let words = text.match(language.patterns.word) || [];
   let functionHits = words
      .map((word) => word.toLocaleLowerCase())
      .filter((word) => language.detection.functionWords.has(word)).length;
   let functionBoost = Math.min(
      language.detection.maxFunctionBoost,
      functionHits * language.detection.functionHitWeight
   );
   let lengthBoost = cyrillic > language.detection.longTextMinLetters
      ? language.detection.longTextBoost
      : 0;
   let ratio = cyrillic / (cyrillic + latin + 1);

   return ratio * (language.detection.baseScore + functionBoost + lengthBoost);
}

function countMatches(text, regex) {
   return (text.match(regex) || []).length;
}
