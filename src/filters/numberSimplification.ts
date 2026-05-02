import { cloneDocument, shouldApply, tokenChangeKey } from "../core/text.js";
import type { Filter, TextDocument, Token, TransformContext } from "../core/types.js";

export const numberSimplificationFilter: Filter = {
   id: "numberSimplification",
   phase: "lexical",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let numberData = context.resources.dictionaries.numbers;
      if (!numberData || numberData.rules.length === 0) return document;

      let rule = numberData.rules[0];
      let tokens: Token[] = [];

      for (let index = 0; index < document.tokens.length; index += 1) {
         let wordNumber = readWordNumber(document.tokens, index, context.language);
         if (wordNumber && wordNumber.value >= (rule.min ?? 20)) {
            let baseKey = tokenChangeKey(context.filter.id, wordNumber.tokens[0], `${rule.id}:words`);
            if (shouldApply(context, baseKey, rule.probability ?? 1)) {
               let sourceText = wordNumber.tokens.map((token) => token.text).join("");
               let nextText = simplifyNumber(wordNumber.tokens[0], wordNumber.value, context, baseKey, rule.labels);
               context.recordChange({
                  filterId: context.filter.id,
                  tokenId: wordNumber.tokens[0].id,
                  from: sourceText,
                  to: nextText,
                  reason: `number-word:${rule.id}`
               });
               tokens.push({
                  ...wordNumber.tokens[0],
                  text: nextText,
                  normalized: nextText.toLocaleLowerCase()
               });
               index = wordNumber.endIndex - 1;
               continue;
            }
         }

         let token = document.tokens[index];
         if (token.kind !== "number") {
            tokens.push(token);
            continue;
         }

         let value = Number(token.text.replace(",", "."));
         if (!Number.isFinite(value) || value < (rule.min ?? 20)) {
            tokens.push(token);
            continue;
         }

         let baseKey = tokenChangeKey(context.filter.id, token, rule.id);
         if (!shouldApply(context, baseKey, rule.probability ?? 1)) {
            tokens.push(token);
            continue;
         }

         let nextText = simplifyNumber(token, value, context, baseKey, rule.labels);
         if (nextText === token.text) {
            tokens.push(token);
            continue;
         }

         context.recordChange({
            filterId: context.filter.id,
            tokenId: token.id,
            from: token.text,
            to: nextText,
            reason: `number:${rule.id}`
         });

         tokens.push({
            ...token,
            text: nextText,
            normalized: nextText.toLocaleLowerCase()
         });
      }

      return cloneDocument(document, tokens);
   }
};

function simplifyNumber(
   token: Token,
   value: number,
   context: TransformContext,
   baseKey: string,
   labels: { many?: string; around?: string } | undefined
): string {
   let variant = context.rng.float(`${baseKey}:variant`);
   if (value >= 10000 && labels?.many && variant > 0.82) return labels.many;

   let factor = value >= 1000 ? 1000 : value >= 100 ? 100 : 10;
   let rounded = variant < 0.5 ? Math.floor(value / factor) * factor : Math.round(value / factor) * factor;
   if (rounded === 0) rounded = factor;

   if (labels?.around && variant > 0.65) {
      return `${labels.around} ${rounded}`;
   }

   return String(rounded);
}

interface WordNumberMatch {
   value: number;
   tokens: Token[];
   endIndex: number;
}

const EN_TENS = new Map([
   ["twenty", 20],
   ["thirty", 30],
   ["forty", 40],
   ["fifty", 50],
   ["sixty", 60],
   ["seventy", 70],
   ["eighty", 80],
   ["ninety", 90]
]);

const EN_ONES = new Map([
   ["one", 1],
   ["two", 2],
   ["three", 3],
   ["four", 4],
   ["five", 5],
   ["six", 6],
   ["seven", 7],
   ["eight", 8],
   ["nine", 9]
]);

const RU_TENS = new Map([
   ["двадцать", 20],
   ["тридцать", 30],
   ["сорок", 40],
   ["пятьдесят", 50],
   ["шестьдесят", 60],
   ["семьдесят", 70],
   ["восемьдесят", 80],
   ["девяносто", 90]
]);

const RU_ONES = new Map([
   ["один", 1],
   ["одна", 1],
   ["два", 2],
   ["две", 2],
   ["три", 3],
   ["четыре", 4],
   ["пять", 5],
   ["шесть", 6],
   ["семь", 7],
   ["восемь", 8],
   ["девять", 9]
]);

function readWordNumber(tokens: Token[], start: number, language: string): WordNumberMatch | null {
   let token = tokens[start];
   if (token?.kind !== "word") return null;

   if (language === "ru") return readRuWordNumber(tokens, start);
   return readEnWordNumber(tokens, start);
}

function readEnWordNumber(tokens: Token[], start: number): WordNumberMatch | null {
   let first = tokens[start];
   let parts = first.normalized.split("-");
   let tens = EN_TENS.get(parts[0]);
   if (!tens) return null;

   if (parts.length === 2) {
      let ones = EN_ONES.get(parts[1]);
      return ones ? { value: tens + ones, tokens: [first], endIndex: start + 1 } : null;
   }

   let nextWord = nextWordAfterSpaces(tokens, start + 1);
   if (nextWord && EN_ONES.has(nextWord.token.normalized)) {
      return {
         value: tens + (EN_ONES.get(nextWord.token.normalized) ?? 0),
         tokens: tokens.slice(start, nextWord.index + 1),
         endIndex: nextWord.index + 1
      };
   }

   return { value: tens, tokens: [first], endIndex: start + 1 };
}

function readRuWordNumber(tokens: Token[], start: number): WordNumberMatch | null {
   let first = tokens[start];
   let tens = RU_TENS.get(first.normalized);
   if (!tens) return null;

   let nextWord = nextWordAfterSpaces(tokens, start + 1);
   if (nextWord && RU_ONES.has(nextWord.token.normalized)) {
      return {
         value: tens + (RU_ONES.get(nextWord.token.normalized) ?? 0),
         tokens: tokens.slice(start, nextWord.index + 1),
         endIndex: nextWord.index + 1
      };
   }

   return { value: tens, tokens: [first], endIndex: start + 1 };
}

function nextWordAfterSpaces(tokens: Token[], start: number): { token: Token; index: number } | null {
   let index = start;
   while (tokens[index]?.kind === "space" || tokens[index]?.text === "-") index += 1;
   let token = tokens[index];
   return token?.kind === "word" ? { token, index } : null;
}
