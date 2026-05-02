import {
   pickRandom,
   restoreCase,
   replaceSentences,
   splitOuterWhitespace
} from "../shared/text.js";
import { EN_MOO_DATA } from "./data/en.js";
import { RU_MOO_DATA } from "./data/ru.js";
import { UNIVERSAL_MOO_DATA } from "./data/universal.js";

export const mooFilter = {
   id: "moo",
   label: "Moo",
   defaultSettings: {
      intensity: 1,
      wordMoos: true,
      sentenceTails: true,
      stretchVowels: true,
      echoWords: true
   },
   controls: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "wordMoos", label: "Before/after words", type: "checkbox" },
      { key: "sentenceTails", label: "Sentence tails", type: "checkbox" },
      { key: "stretchVowels", label: "Stretch vowels", type: "checkbox" },
      { key: "echoWords", label: "Echo words", type: "checkbox" }
   ],
   data: {
      en: EN_MOO_DATA,
      ru: RU_MOO_DATA,
      universal: UNIVERSAL_MOO_DATA
   },
   transformText
};

// Adds variable cow-like sounds before/after words and at sentence endings.
export function transformText(text, context) {
   let { leading, body, trailing } = splitOuterWhitespace(text);
   if (!body) return text;

   let output = context.filterSettings.sentenceTails ? addSentenceTails(body, context) : body;
   output = addWordEffects(output, context);

   return leading + output + trailing;
}

function addSentenceTails(text, context) {
   return replaceSentences(text, (body, punctuation) => {
      if (context.random() >= context.intensity * context.data.probabilities.sentenceTail) {
         return body + punctuation;
      }

      return body + " " + pickRandom(context.data.sentenceTails, context) + punctuation;
   });
}

function addWordEffects(text, context) {
   return text.replace(context.languageData.patterns.word, (word) => {
      if (word.length < context.data.minWordLength) return word;

      let output = word;
      if (context.filterSettings.stretchVowels) {
         output = stretchWord(output, context);
      }

      if (context.filterSettings.echoWords && context.random() < context.intensity * context.data.probabilities.echoWord) {
         output = output + pickRandom(context.data.echoJoiners, context) + restoreCase(word, word.toLocaleLowerCase());
      }

      if (context.filterSettings.wordMoos && context.random() < context.intensity * context.data.probabilities.beforeWord) {
         output = pickRandom(context.data.beforeWord, context) + output;
      }

      if (context.filterSettings.wordMoos && context.random() < context.intensity * context.data.probabilities.afterWord) {
         output += pickRandom(context.data.afterWord, context);
      }

      return output;
   });
}

function stretchWord(word, context) {
   if (word.length < context.data.minStretchWordLength) return word;
   if (context.random() >= context.intensity * context.data.probabilities.stretchVowel) return word;

   let chars = Array.from(word);
   let candidates = chars
      .map((char, index) => ({ char, index }))
      .filter((entry) => isStretchableVowel(entry.char, context));

   if (candidates.length === 0) return word;

   let picked = candidates[Math.floor(context.random() * candidates.length)];
   let extra = 2 + Math.floor(context.random() * Math.max(1, context.data.maxStretch));
   chars[picked.index] = picked.char.repeat(extra);
   return chars.join("");
}

function isStretchableVowel(char, context) {
   let pattern = context.data.vowelPattern;
   pattern.lastIndex = 0;
   return pattern.test(char);
}
