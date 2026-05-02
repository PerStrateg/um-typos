import { pickRandom, restoreCase, splitOuterWhitespace } from "../shared/text.js";
import { EN_WORD_REPLACE_DATA } from "./data/en.js";
import { UNIVERSAL_WORD_REPLACE_DATA } from "./data/universal.js";

export const wordReplaceFilter = {
   id: "wordReplace",
   label: "Word Replace",
   defaultSettings: {
      intensity: 1,
      preserveCase: true
   },
   controls: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "preserveCase", label: "Preserve case", type: "checkbox" }
   ],
   data: {
      en: EN_WORD_REPLACE_DATA,
      universal: UNIVERSAL_WORD_REPLACE_DATA
   },
   transformText
};

// Applies configured regexp tuple replacements to text.
export function transformText(text, context) {
   let { leading, body, trailing } = splitOuterWhitespace(text);
   if (!body) return text;

   let output = body;
   for (let [pattern, replacements, probability] of context.data.replacements || []) {
      output = output.replace(pattern, (match) => {
         if (context.random() >= context.intensity * probability) return match;
         let replacement = pickRandom(replacements, context);
         return context.filterSettings.preserveCase ? restoreCase(match, replacement) : replacement;
      });
   }

   return leading + output + trailing;
}
