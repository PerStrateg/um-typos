import { escapeHtml, pickRandom, splitOuterWhitespace } from "../shared/text.js";
import { EN_CASE_COLOR_DATA } from "./data/en.js";
import { UNIVERSAL_CASE_COLOR_DATA } from "./data/universal.js";

export const caseColorFilter = {
   id: "caseColor",
   label: "Case + Color",
   defaultSettings: {
      intensity: 1,
      caseEnabled: true,
      colorEnabled: true
   },
   controls: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "caseEnabled", label: "Random case", type: "checkbox" },
      { key: "colorEnabled", label: "Letter colors", type: "checkbox" }
   ],
   data: {
      en: EN_CASE_COLOR_DATA,
      universal: UNIVERSAL_CASE_COLOR_DATA
   },
   transformText,
   decorateHtml
};

// Randomizes letter case in plain text mode.
export function transformText(text, context) {
   if (!context.filterSettings.caseEnabled) return text;

   let { leading, body, trailing } = splitOuterWhitespace(text);
   if (!body) return text;

   let output = Array.from(body).map((char) => {
      if (!isLetter(char, context) || context.random() >= context.intensity * context.data.caseProbability) {
         return char;
      }

      return context.random() < context.data.uppercaseProbability
         ? char.toLocaleUpperCase()
         : char.toLocaleLowerCase();
   }).join("");

   return leading + output + trailing;
}

// Wraps some letters in color spans for normal DOM text only.
export function decorateHtml(text, context) {
   if (!context.filterSettings.colorEnabled) return null;

   let changed = false;
   let html = Array.from(text).map((char) => {
      if (!isLetter(char, context) || context.random() >= context.intensity * context.data.colorProbability) {
         return escapeHtml(char);
      }

      changed = true;
      let color = pickRandom(context.data.colors, context);
      return `<span class="${context.data.spanClass}" ${context.data.spanAttribute}="true" style="color:${color}">${escapeHtml(char)}</span>`;
   }).join("");

   return changed ? html : null;
}

function isLetter(char, context) {
   let pattern = context.languageData.patterns.letter;
   pattern.lastIndex = 0;
   return pattern.test(char);
}
