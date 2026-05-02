import { cloneDocument, createInsertedTokens, pickWeightedVariant, shouldApply } from "../core/text.js";
import type { EmojiEntry, Filter, TextDocument, Token, TransformContext } from "../core/types.js";

interface SentenceRange {
   index: number;
   start: number;
   end: number;
   punctuationIndex?: number;
}

interface PendingInsertion {
   index: number;
   text: string;
   idPrefix: string;
   reason: string;
}

export const emojiFilter: Filter = {
   id: "emoji",
   phase: "post",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let emojiData = context.resources.dictionaries.emoji;
      if (!emojiData || emojiData.entries.length === 0) return document;

      let pending: PendingInsertion[] = [];
      let sentences = getSentenceRanges(document.tokens);

      for (let entry of emojiData.entries) {
         if (entry.position === "documentTail") {
            maybeQueueDocumentTail(document, context, entry, pending);
            continue;
         }

         for (let sentence of sentences) {
            maybeQueueSentenceTail(document, context, entry, sentence, pending);
         }
      }

      if (pending.length === 0) return document;

      let byIndex = new Map<number, PendingInsertion[]>();
      for (let insertion of pending) {
         let list = byIndex.get(insertion.index);
         if (list) list.push(insertion);
         else byIndex.set(insertion.index, [insertion]);
      }

      let tokens: Token[] = [];
      for (let index = 0; index < document.tokens.length; index += 1) {
         tokens.push(document.tokens[index]);
         for (let insertion of byIndex.get(index) ?? []) {
            tokens.push(...createInsertedTokens(insertion.text, document.language, context.resources.segmenter, insertion.idPrefix));
         }
      }

      for (let insertion of byIndex.get(document.tokens.length) ?? []) {
         tokens.push(...createInsertedTokens(insertion.text, document.language, context.resources.segmenter, insertion.idPrefix));
      }

      return cloneDocument(document, tokens);
   }
};

function maybeQueueDocumentTail(
   document: TextDocument,
   context: TransformContext,
   entry: EmojiEntry,
   pending: PendingInsertion[]
): void {
   let wordCount = document.tokens.filter((token) => token.kind === "word" || token.kind === "number").length;
   if (wordCount < (entry.minWords ?? 0)) return;

   let baseKey = `${context.filter.id}:document:${entry.id}`;
   if (!shouldApply(context, baseKey, entry.probability ?? 1)) return;

   let variant = pickWeightedVariant(context, baseKey, entry.values);
   if (!variant) return;

   pending.push({
      index: document.tokens.length,
      text: variant.value.startsWith(" ") ? variant.value : ` ${variant.value}`,
      idPrefix: `emoji:${context.filter.id}:document:${entry.id}`,
      reason: `emoji:${entry.id}`
   });
   context.recordChange({
      filterId: context.filter.id,
      from: "",
      to: variant.value,
      reason: `emoji:${entry.id}`
   });
}

function maybeQueueSentenceTail(
   document: TextDocument,
   context: TransformContext,
   entry: EmojiEntry,
   sentence: SentenceRange,
   pending: PendingInsertion[]
): void {
   let wordCount = document.tokens
      .slice(sentence.start, sentence.end)
      .filter((token) => token.kind === "word" || token.kind === "number")
      .length;
   if (wordCount < (entry.minWords ?? 0)) return;

   let baseKey = `${context.filter.id}:s${sentence.index}:${entry.id}`;
   if (!shouldApply(context, baseKey, entry.probability ?? 1)) return;

   let variant = pickWeightedVariant(context, baseKey, entry.values);
   if (!variant) return;

   let target = sentence.punctuationIndex ?? sentence.end - 1;
   pending.push({
      index: target,
      text: variant.value.startsWith(" ") ? variant.value : ` ${variant.value}`,
      idPrefix: `emoji:${context.filter.id}:s${sentence.index}:${entry.id}`,
      reason: `emoji:${entry.id}`
   });
   context.recordChange({
      filterId: context.filter.id,
      tokenId: document.tokens[target]?.id,
      from: "",
      to: variant.value,
      reason: `emoji:${entry.id}`
   });
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
