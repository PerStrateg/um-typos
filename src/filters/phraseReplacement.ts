import { cloneDocument, createInsertedTokens, pickWeightedVariant, restoreCase, shouldApply } from "../core/text.js";
import type { Filter, ReplacementEntry, TextDocument, Token, TransformContext } from "../core/types.js";

const PHRASE_WORD_RE = /[\p{L}\p{M}\p{Number}]+(?:['-][\p{L}\p{M}\p{Number}]+)*/gu;

interface PreparedPhrase {
   entry: ReplacementEntry;
   words: string[];
}

interface PhraseMatch {
   start: number;
   end: number;
}

export const phraseReplacementFilter: Filter = {
   id: "phraseReplacement",
   phase: "pre",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let dictionary = context.resources.dictionaries.phrases;
      if (!dictionary || dictionary.entries.length === 0) return document;

      let phrases = dictionary.entries
         .map(preparePhrase)
         .filter((phrase): phrase is PreparedPhrase => phrase !== null)
         .sort((left, right) => right.words.length - left.words.length);

      if (phrases.length === 0) return document;

      let tokens: Token[] = [];
      for (let index = 0; index < document.tokens.length; index += 1) {
         let match = findFirstPhrase(document.tokens, index, phrases);
         if (!match) {
            tokens.push(document.tokens[index]);
            continue;
         }

         let { phrase, range } = match;
         let sourceText = document.tokens.slice(range.start, range.end).map((token) => token.text).join("");
         let baseKey = `${context.filter.id}:${document.tokens[range.start].id}:${phrase.entry.source}`;

         if (!shouldApply(context, baseKey, phrase.entry.probability ?? 1)) {
            tokens.push(document.tokens[index]);
            continue;
         }

         let variant = pickWeightedVariant(context, baseKey, phrase.entry.variants);
         if (!variant) {
            tokens.push(document.tokens[index]);
            continue;
         }

         let replacement = restoreCase(document.tokens[range.start].text, variant.value);
         tokens.push(...createInsertedTokens(replacement, document.language, context.resources.segmenter, `phr:${context.filter.id}:${range.start}`));
         context.recordChange({
            filterId: context.filter.id,
            tokenId: document.tokens[range.start].id,
            from: sourceText,
            to: replacement,
            reason: `phrase:${phrase.entry.source}`
         });

         index = range.end - 1;
      }

      return cloneDocument(document, tokens);
   }
};

function preparePhrase(entry: ReplacementEntry): PreparedPhrase | null {
   let words = entry.source.toLocaleLowerCase().match(PHRASE_WORD_RE) ?? [];
   if (words.length < 2) return null;
   return { entry, words };
}

function findFirstPhrase(
   tokens: Token[],
   index: number,
   phrases: PreparedPhrase[]
): { phrase: PreparedPhrase; range: PhraseMatch } | null {
   if (!isWordToken(tokens[index])) return null;

   for (let phrase of phrases) {
      let range = matchPhraseAt(tokens, index, phrase.words);
      if (range) return { phrase, range };
   }

   return null;
}

function matchPhraseAt(tokens: Token[], start: number, words: string[]): PhraseMatch | null {
   let cursor = start;

   for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      if (wordIndex > 0) {
         while (cursor < tokens.length && tokens[cursor].kind === "space") {
            cursor += 1;
         }
      }

      let token = tokens[cursor];
      if (!isWordToken(token) || token.normalized !== words[wordIndex]) return null;
      cursor += 1;
   }

   return { start, end: cursor };
}

function isWordToken(token: Token | undefined): token is Token {
   return Boolean(token && (token.kind === "word" || token.kind === "number"));
}
