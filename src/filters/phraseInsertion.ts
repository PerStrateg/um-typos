import { cloneDocument, createInsertedTokens, pickWeightedVariant, shouldApply } from "../core/text.js";
import type { Filter, InsertionEntry, TextDocument, Token, TransformContext } from "../core/types.js";

interface SentenceRange {
   index: number;
   start: number;
   end: number;
   punctuationIndex?: number;
}

interface PendingInsertion {
   text: string;
   idPrefix: string;
   lowerNextWord?: boolean;
}

export const phraseInsertionFilter: Filter = {
   id: "phraseInsertion",
   phase: "syntactic",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let insertionData = context.resources.dictionaries.insertions;
      if (!insertionData || insertionData.entries.length === 0) return document;

      let before = new Map<number, PendingInsertion[]>();
      let after = new Map<number, PendingInsertion[]>();
      let sentences = getSentenceRanges(document.tokens);

      for (let sentence of sentences) {
         let words = wordsInRange(document.tokens, sentence);
         if (words.length < (insertionData.sentenceMinWords ?? 1)) continue;

         for (let entry of insertionData.entries) {
            if (words.length < (entry.minWords ?? 0)) continue;

            let baseKey = `${context.filter.id}:s${sentence.index}:${entry.id}`;
            if (!shouldApply(context, baseKey, entry.probability ?? 1)) continue;

            let variant = pickWeightedVariant(context, baseKey, entry.values);
            if (!variant) continue;

            let pending = createPendingInsertion(context, sentence, entry, variant.value);
            let target = findInsertionTarget(document.tokens, sentence, words, entry, context, baseKey);
            if (target === undefined) continue;

            if (entry.position === "afterWord" || target >= document.tokens.length) {
               appendInsertion(after, target, pending);
            } else {
               appendInsertion(before, target, pending);
            }

            context.recordChange({
               filterId: context.filter.id,
               tokenId: document.tokens[target]?.id,
               from: "",
               to: pending.text,
               reason: `insertion:${entry.id}`
            });
         }
      }

      if (before.size === 0 && after.size === 0) return document;

      let tokens: Token[] = [];
      for (let index = 0; index < document.tokens.length; index += 1) {
         let lowerCurrentWord = false;
         for (let insertion of before.get(index) ?? []) {
            tokens.push(...createInsertedTokens(insertion.text, document.language, context.resources.segmenter, insertion.idPrefix));
            lowerCurrentWord ||= Boolean(insertion.lowerNextWord);
         }

         tokens.push(lowerCurrentWord ? lowerFirstWordToken(document.tokens[index]) : document.tokens[index]);

         for (let insertion of after.get(index) ?? []) {
            tokens.push(...createInsertedTokens(insertion.text, document.language, context.resources.segmenter, insertion.idPrefix));
         }
      }

      let endInsertions = after.get(document.tokens.length) ?? [];
      for (let insertion of endInsertions) {
         tokens.push(...createInsertedTokens(insertion.text, document.language, context.resources.segmenter, insertion.idPrefix));
      }

      return cloneDocument(document, tokens);
   }
};

function createPendingInsertion(
   context: TransformContext,
   sentence: SentenceRange,
   entry: InsertionEntry,
   value: string
): PendingInsertion {
   let text = value;
   if (entry.position === "prefix" || entry.position === "beforeWord") {
      text = value.endsWith(" ") ? value : `${value} `;
   } else if (entry.position === "tail" || entry.position === "afterWord") {
      text = value.startsWith(" ") ? value : ` ${value}`;
   }

   return {
      text,
      idPrefix: `ins:${context.filter.id}:${sentence.index}:${entry.id}`,
      lowerNextWord: entry.position === "prefix"
   };
}

function findInsertionTarget(
   tokens: Token[],
   sentence: SentenceRange,
   words: Token[],
   entry: InsertionEntry,
   context: TransformContext,
   baseKey: string
): number | undefined {
   if (entry.position === "prefix") return words[0]?.meta?.index as number | undefined;
   if (entry.position === "tail") return sentence.punctuationIndex ?? sentence.end;

   let candidates = words.filter(
      (token) =>
         token.text.length >= (entry.minWordLength ?? 1) &&
         !isNextToQuote(tokens, token.meta?.index as number | undefined)
   );
   if (entry.nlpPattern && context.resources.nlp) {
      let sentenceText = tokens.slice(sentence.start, sentence.end).map((token) => token.text).join("");
      let matches = new Set(
         context.resources.nlp
            .analyze(sentenceText)
            .match(entry.nlpPattern)
            .map((match) => match.toLocaleLowerCase())
      );
      let nlpCandidates = candidates.filter((token) => matches.has(token.text.toLocaleLowerCase()));
      if (nlpCandidates.length > 0) candidates = nlpCandidates;
   }

   if (entry.nlpPattern) {
      let hintedCandidates = candidates.filter((token) => tokenMatchesLanguageHint(token, entry.nlpPattern ?? "", context));
      if (hintedCandidates.length > 0) candidates = hintedCandidates;
   }

   let target = context.rng.pick(`${baseKey}:target`, candidates);
   return target?.meta?.index as number | undefined;
}

function tokenMatchesLanguageHint(token: Token, pattern: string, context: TransformContext): boolean {
   let hints = context.resources.rules.languageHints?.nlpHints;
   if (!hints) return false;

   let normalized = token.normalized;
   if (pattern.includes("#Verb")) {
      if (hints.nonVerbExceptions?.includes(normalized)) return false;
      return endsWithAny(normalized, hints.verbSuffixes ?? []);
   }

   if (pattern.includes("#Adjective")) {
      return endsWithAny(normalized, hints.adjectiveSuffixes ?? []);
   }

   if (pattern.includes("#Adverb")) {
      let minLength = hints.minAdverbLength ?? 1;
      return normalized.length >= minLength && endsWithAny(normalized, hints.adverbSuffixes ?? []);
   }

   return false;
}

function endsWithAny(value: string, suffixes: string[]): boolean {
   return suffixes.some((suffix) => value.endsWith(suffix));
}

function appendInsertion(map: Map<number, PendingInsertion[]>, index: number, insertion: PendingInsertion): void {
   let list = map.get(index);
   if (list) {
      list.push(insertion);
      return;
   }

   map.set(index, [insertion]);
}

function getSentenceRanges(tokens: Token[]): SentenceRange[] {
   let ranges: SentenceRange[] = [];
   let start = 0;
   let index = 0;

   for (let cursor = 0; cursor < tokens.length; cursor += 1) {
      let token = tokens[cursor];
      if (token.kind === "punctuation" && /[.!?]/u.test(token.text)) {
         ranges.push({ index, start, end: cursor + 1, punctuationIndex: cursor });
         start = cursor + 1;
         index += 1;
      }
   }

   if (start < tokens.length) {
      ranges.push({ index, start, end: tokens.length });
   }

   return ranges;
}

function wordsInRange(tokens: Token[], sentence: SentenceRange): Token[] {
   let words: Token[] = [];
   let quoteDepth = 0;

   for (let index = sentence.start; index < sentence.end; index += 1) {
      let token = tokens[index];
      if (isQuoteToken(token)) {
         quoteDepth = quoteDepth === 0 ? 1 : 0;
         continue;
      }
      if (quoteDepth > 0) continue;

      if (token.kind === "word" || token.kind === "number") {
         words.push({
            ...token,
            meta: {
               ...(token.meta ?? {}),
               index
            }
         });
      }
   }

   return words;
}

function lowerFirstWordToken(token: Token): Token {
   if (token.kind !== "word") return token;
   let nextText = token.text.replace(/\p{L}/u, (letter) => letter.toLocaleLowerCase());
   if (nextText === token.text) return token;
   return {
      ...token,
      text: nextText,
      normalized: nextText.toLocaleLowerCase()
   };
}

function isQuoteToken(token: Token): boolean {
   return token.kind === "punctuation" && /^["'“”«»„‘’]$/u.test(token.text);
}

function isNextToQuote(tokens: Token[], index: number | undefined): boolean {
   if (index === undefined) return false;
   let previous = nearestNonSpace(tokens, index - 1, -1);
   let next = nearestNonSpace(tokens, index + 1, 1);
   return Boolean((previous && isQuoteToken(previous)) || (next && isQuoteToken(next)));
}

function nearestNonSpace(tokens: Token[], start: number, step: 1 | -1): Token | undefined {
   for (let index = start; index >= 0 && index < tokens.length; index += step) {
      if (tokens[index].kind !== "space") return tokens[index];
   }

   return undefined;
}
