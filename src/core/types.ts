export type TokenKind = "word" | "space" | "punctuation" | "number" | "emoji" | "other";
export type FilterPhase = "pre" | "lexical" | "syntactic" | "post";
export type SegmentGranularity = "grapheme" | "word" | "sentence";

export interface Token {
   id: string;
   text: string;
   normalized: string;
   kind: TokenKind;
   start: number;
   end: number;
   tags?: string[];
   meta?: Record<string, unknown>;
}

export interface TextDocument {
   original: string;
   language: string;
   tokens: Token[];
   metadata: Record<string, unknown>;
}

export interface WeightedVariant {
   value: string;
   weight?: number;
}

export interface ReplacementEntry {
   source: string;
   variants: WeightedVariant[];
   tags?: string[];
   probability?: number;
}

export interface DictionaryData {
   version: number;
   language: string;
   entries: ReplacementEntry[];
}

export interface EmojiEntry {
   id: string;
   position: "documentTail" | "sentenceTail";
   values: WeightedVariant[];
   probability?: number;
   minWords?: number;
}

export interface EmojiData {
   version: number;
   language: string;
   entries: EmojiEntry[];
}

export interface RegexRule {
   id: string;
   pattern: string;
   replacement: string;
   flags?: string;
   probability?: number;
}

export interface RegexRulesData {
   version: number;
   language: string;
   rules: RegexRule[];
}

export interface InsertionEntry {
   id: string;
   position: "prefix" | "tail" | "beforeWord" | "afterWord";
   values: WeightedVariant[];
   probability?: number;
   minWords?: number;
   minWordLength?: number;
   nlpPattern?: string;
}

export interface InsertionData {
   version: number;
   language: string;
   sentenceMinWords?: number;
   entries: InsertionEntry[];
}

export interface NumberRule {
   id: string;
   min?: number;
   probability?: number;
   labels?: {
      many?: string;
      around?: string;
   };
}

export interface NumberData {
   version: number;
   language: string;
   rules: NumberRule[];
}

export interface LanguageDictionaries {
   phrases?: DictionaryData;
   replacements?: DictionaryData;
   misspellings?: DictionaryData;
   insertions?: InsertionData;
   numbers?: NumberData;
   emoji?: EmojiData;
   morphology?: Record<string, unknown>;
   [key: string]: unknown;
}

export interface LanguageHints {
   version?: number;
   language?: string;
   source?: string;
   aliases?: string[];
   patterns?: Record<string, string>;
   detection?: Record<string, unknown>;
   nlpHints?: {
      verbSuffixes?: string[];
      adjectiveSuffixes?: string[];
      adverbSuffixes?: string[];
      nonVerbExceptions?: string[];
      minAdverbLength?: number;
   };
   [key: string]: unknown;
}

export interface LanguageRules {
   regexRules?: RegexRulesData;
   languageHints?: LanguageHints;
   [key: string]: unknown;
}

export interface SegmentResult {
   segment: string;
   index: number;
   isWordLike?: boolean;
}

export interface SegmenterAdapter {
   segment(text: string, granularity: SegmentGranularity): Iterable<SegmentResult>;
}

export interface LanguageDetectorAdapter {
   detect(text: string, options?: { only?: string[]; minLength?: number }): string;
}

export interface NlpDocument {
   has(pattern: string): boolean;
   match(pattern: string): string[];
}

export interface NlpAdapter {
   id: string;
   capabilities: string[];
   analyze(text: string): NlpDocument;
}

export interface LanguageResources {
   segmenter?: SegmenterAdapter;
   nlp?: NlpAdapter;
   dictionaries: LanguageDictionaries;
   rules: LanguageRules;
}

export interface DeterministicRandom {
   seed: string;
   float(key: string): number;
   int(key: string, minInclusive: number, maxExclusive: number): number;
   pick<T>(key: string, values: readonly T[]): T | undefined;
   weightedPick<T extends { weight?: number }>(key: string, values: readonly T[]): T | undefined;
   fork(label: string): DeterministicRandom;
}

export interface TextChange {
   filterId: string;
   tokenId?: string;
   from: string;
   to: string;
   reason?: string;
}

export interface FilterConfig {
   enabled: boolean;
   intensity?: number;
   probability?: number;
   options?: Record<string, unknown>;
}

export interface TransformContext {
   seed: string;
   intensity: number;
   language: string;
   rng: DeterministicRandom;
   options: Record<string, unknown>;
   resources: LanguageResources;
   filter: {
      id: string;
      intensity: number;
      probability: number;
      options: Record<string, unknown>;
   };
   changes: TextChange[];
   warnings: string[];
   recordChange(change: TextChange): void;
}

export interface Filter {
   id: string;
   phase: FilterPhase;
   languages?: string[] | "any";
   apply(document: TextDocument, context: TransformContext): TextDocument;
}

export interface LanguagePack {
   code: string;
   aliases: string[];
   segmenter?: SegmenterAdapter;
   nlp?: NlpAdapter;
   dictionaries: LanguageDictionaries;
   filters: Filter[];
   rules: LanguageRules;
}

export interface TransformOptions {
   language?: "auto" | string;
   intensity?: number;
   filters?: Record<string, Partial<FilterConfig>>;
   filterOrder?: string[];
   options?: Record<string, unknown>;
}

export interface TransformResult {
   text: string;
   language: string;
   appliedFilters: string[];
   changes?: TextChange[];
   warnings?: string[];
}

export interface TextTransformEngine {
   transform(text: string, options?: TransformOptions): TransformResult;
   registerLanguage(languagePack: LanguagePack): void;
   registerFilter(filter: Filter): void;
   getLanguages(): LanguagePack[];
   getFilters(): Filter[];
}

export interface EngineConfig {
   seed: string;
   languages?: LanguagePack[];
   filters?: Filter[];
   defaultLanguage?: string;
   detector?: LanguageDetectorAdapter;
   segmenter?: SegmenterAdapter;
}
