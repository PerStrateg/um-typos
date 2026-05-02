import type {
   SegmenterAdapter,
   TextDocument,
   Token,
   TokenKind,
   TransformContext,
   WeightedVariant
} from "./types.js";

const SPACE_RE = /^\s+$/u;
const NUMBER_RE = /^[\p{Number}]+(?:[.,][\p{Number}]+)*$/u;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const PUNCTUATION_RE = /^[\p{P}\p{S}]+$/u;
const WORD_RE = /[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*/gu;

export function normalizeInput(text: string): string {
   return text.normalize("NFC");
}

export function buildDocument(text: string, language: string, segmenter?: SegmenterAdapter): TextDocument {
   let normalized = normalizeInput(text);
   return {
      original: normalized,
      language,
      tokens: tokenizeText(normalized, language, segmenter),
      metadata: {}
   };
}

export function tokenizeText(text: string, language: string, segmenter?: SegmenterAdapter): Token[] {
   if (!text) return [];

   let segments = segmenter ? Array.from(segmenter.segment(text, "word")) : fallbackSegments(text);
   let tokens: Token[] = [];
   let cursor = 0;
   let tokenIndex = 0;

   for (let segment of segments) {
      let start = segment.index;
      if (start < cursor || text.slice(start, start + segment.segment.length) !== segment.segment) {
         start = text.indexOf(segment.segment, cursor);
      }
      if (start < 0) start = cursor;

      if (start > cursor) {
         tokenIndex = pushTokenPieces(tokens, text.slice(cursor, start), cursor, tokenIndex);
      }

      let end = start + segment.segment.length;
      tokenIndex = pushToken(tokens, segment.segment, classifyToken(segment.segment, Boolean(segment.isWordLike)), start, end, tokenIndex);
      cursor = end;
   }

   if (cursor < text.length) {
      pushTokenPieces(tokens, text.slice(cursor), cursor, tokenIndex);
   }

   return tokens.map((token, index) => ({ ...token, id: token.id || `t${index}:${token.start}-${token.end}` }));
}

export function renderDocument(document: TextDocument): string {
   return document.tokens.map((token) => token.text).join("");
}

export function createInsertedTokens(
   text: string,
   language: string,
   segmenter: SegmenterAdapter | undefined,
   idPrefix: string
): Token[] {
   return tokenizeText(text, language, segmenter).map((token, index) => ({
      ...token,
      id: `${idPrefix}:${index}`,
      start: -1,
      end: -1,
      meta: {
         ...(token.meta ?? {}),
         inserted: true
      }
   }));
}

export function restoreCase(source: string, replacement: string): string {
   if (source === source.toLocaleUpperCase() && source !== source.toLocaleLowerCase()) {
      return replacement.toLocaleUpperCase();
   }

   if (startsWithUppercase(source)) {
      return replacement.charAt(0).toLocaleUpperCase() + replacement.slice(1);
   }

   return replacement;
}

export function startsWithUppercase(text: string): boolean {
   let first = Array.from(text)[0] ?? "";
   return first === first.toLocaleUpperCase() && first !== first.toLocaleLowerCase();
}

export function lowerFirstWord(text: string): string {
   return text.replace(/\p{L}/u, (letter) => letter.toLocaleLowerCase());
}

export function shouldApply(context: TransformContext, baseKey: string, probability = 1): boolean {
   let finalProbability = context.intensity * context.filter.intensity * context.filter.probability * probability;
   if (finalProbability <= 0) return false;
   if (finalProbability >= 1) return true;
   return context.rng.float(`${baseKey}:apply`) < finalProbability;
}

export function pickWeightedVariant(
   context: TransformContext,
   baseKey: string,
   variants: readonly WeightedVariant[]
): WeightedVariant | undefined {
   return context.rng.weightedPick(`${baseKey}:variant`, variants);
}

export function tokenChangeKey(filterId: string, token: Token, ruleId: string): string {
   return `${filterId}:${token.id}:${ruleId}`;
}

export function cloneDocument(document: TextDocument, tokens: Token[]): TextDocument {
   return {
      ...document,
      tokens
   };
}

function fallbackSegments(text: string): Array<{ segment: string; index: number; isWordLike?: boolean }> {
   let segments: Array<{ segment: string; index: number; isWordLike?: boolean }> = [];
   let cursor = 0;

   for (let match of text.matchAll(WORD_RE)) {
      let word = match[0];
      let start = match.index ?? cursor;
      if (start > cursor) {
         segments.push({ segment: text.slice(cursor, start), index: cursor, isWordLike: false });
      }
      segments.push({ segment: word, index: start, isWordLike: true });
      cursor = start + word.length;
   }

   if (cursor < text.length) {
      segments.push({ segment: text.slice(cursor), index: cursor, isWordLike: false });
   }

   return segments;
}

function pushTokenPieces(tokens: Token[], text: string, offset: number, tokenIndex: number): number {
   let cursor = 0;
   let piecePattern = /\s+|[^\s]+/gu;

   for (let match of text.matchAll(piecePattern)) {
      let piece = match[0];
      let start = offset + (match.index ?? cursor);
      tokenIndex = pushToken(tokens, piece, classifyToken(piece, false), start, start + piece.length, tokenIndex);
      cursor = (match.index ?? cursor) + piece.length;
   }

   return tokenIndex;
}

function pushToken(tokens: Token[], text: string, kind: TokenKind, start: number, end: number, tokenIndex: number): number {
   tokens.push({
      id: `t${tokenIndex}:${start}-${end}`,
      text,
      normalized: text.toLocaleLowerCase(),
      kind,
      start,
      end
   });

   return tokenIndex + 1;
}

function classifyToken(text: string, isWordLike: boolean): TokenKind {
   if (SPACE_RE.test(text)) return "space";
   if (EMOJI_RE.test(text)) return "emoji";
   if (NUMBER_RE.test(text)) return "number";
   if (isWordLike) return "word";
   if (PUNCTUATION_RE.test(text)) return "punctuation";
   return "other";
}
