import {
   pickRandom,
   prependAfterWhitespace,
   replaceSentences,
   splitOuterWhitespace
} from "../shared/text.js";
import { EN_PROFANITY_DATA } from "./data/en.js";
import { UNIVERSAL_PROFANITY_DATA } from "./data/universal.js";

export const profanityFilter = {
   id: "profanity",
   label: "Mild Swears",
   defaultSettings: {
      intensity: 1,
      prefixes: true,
      midSentence: true,
      tails: true
   },
   controls: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "prefixes", label: "Sentence starts", type: "checkbox" },
      { key: "midSentence", label: "Middle inserts", type: "checkbox" },
      { key: "tails", label: "Sentence tails", type: "checkbox" }
   ],
   data: {
      en: EN_PROFANITY_DATA,
      universal: UNIVERSAL_PROFANITY_DATA
   },
   transformText
};

// Adds mild, non-obscene interjections into sentences.
export function transformText(text, context) {
   let { leading, body, trailing } = splitOuterWhitespace(text);
   if (!body) return text;

   let output = replaceSentences(body, (sentenceBody, punctuation) => {
      let words = sentenceBody.match(context.languageData.patterns.word) || [];
      if (words.length < context.data.minWords) return sentenceBody + punctuation;

      let transformed = sentenceBody;
      if (context.filterSettings.prefixes && context.random() < context.intensity * context.data.probabilities.prefix) {
         transformed = prependAfterWhitespace(transformed, pickRandom(context.data.prefixes, context));
      }

      if (context.filterSettings.midSentence && context.random() < context.intensity * context.data.probabilities.midSentence) {
         transformed = insertAfterFirstWord(transformed, pickRandom(context.data.interjections, context), context);
      }

      if (context.filterSettings.tails && context.random() < context.intensity * context.data.probabilities.tail) {
         transformed += " " + pickRandom(context.data.tails, context);
      }

      return transformed + punctuation;
   });

   return leading + output + trailing;
}

function insertAfterFirstWord(text, insertedWord, context) {
   let inserted = false;
   return text.replace(context.languageData.patterns.word, (word) => {
      if (inserted) return word;
      inserted = true;
      return word + ", " + insertedWord + ",";
   });
}
