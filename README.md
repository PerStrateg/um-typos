# um-typos

`um-typos` is a modular TypeScript library for turning regular text into a more casual, typo-heavy, filler-word style. It inserts low-meaning phrases such as `like`, `um`, and `basically`, replaces words through curated dictionaries, applies misspelling rules, and can fuzz numbers by scrambling or rounding them.

The project is based on an older typo-styling prototype, but the current version is built as a deterministic text transformation engine with language packs, configurable filters, and debug-friendly change output.

## What It Does

`um-typos` can transform text by:

- inserting filler words and phrases in natural sentence positions;
- replacing words with curated variants or nearby slangy alternatives;
- misspelling words through dictionaries and regex-style rules;
- simplifying, scrambling, or rounding numbers like `63`, `1238`, or `15003`;
- adding optional emoji or post-style sentence endings;
- preserving whitespace, punctuation, capitalization, and basic document shape.

The amount of transformation is controlled with an `intensity` value. `0` means little or no styling, `1` is the intended full-strength setting, and values above `1` are allowed when you want more aggressive output.

Because transformations are seed-based, the same input, seed, language, and options produce the same output every time.

## Install

```sh
npm install um-typos
```

For local development inside this repository:

```sh
npm install
```

## Playground

Use the playground to compare the built-in sample texts across different seeds and intensity profiles:

```sh
npm run playground -- all all
npm run playground -- readme-en strong readme-compare
npm run playground -- readme-ru balanced demo-seed --changes
```

Samples live in `data/playground-cases.json`. Profiles live in `scripts/playground.mjs`.

## Quick Start

```ts
import {
   createTextTransformEngine,
   englishPack,
   russianPack
} from "um-typos";

const engine = createTextTransformEngine({
   seed: "demo-seed",
   languages: [englishPack, russianPack],
   defaultLanguage: "en"
});

const result = engine.transform(
   "This application transforms text into something that sounds more casual. It has 1238 examples.",
   {
      language: "en",
      intensity: 0.85,
      filters: {
         phraseReplacement: { enabled: true, intensity: 1 },
         dictionaryReplacement: { enabled: true, intensity: 1 },
         misspelling: { enabled: true, intensity: 0.8 },
         phraseInsertion: { enabled: true, intensity: 0.8 },
         numberSimplification: { enabled: true, intensity: 1 },
         emoji: { enabled: false }
      }
   }
);

console.log(result.text);
console.log(result.changes);
```

Example output will vary with the seed and settings, but it may look like:

> Thiz app, like, transformz text into sumthin dat soundz more casual. It haz basically about one thousand examplez.

## API

### `createTextTransformEngine(config)`

Creates a reusable transformation engine.

```ts
const engine = createTextTransformEngine({
   seed: "user-or-document-seed",
   languages: [englishPack, russianPack],
   defaultLanguage: "en"
});
```

Config fields:

- `seed`: stable string used for deterministic random choices.
- `languages`: language packs available to the engine.
- `filters`: optional custom filter list.
- `defaultLanguage`: fallback language code.
- `detector`: optional language detector adapter.
- `segmenter`: optional text segmenter adapter.

### `engine.transform(text, options)`

Transforms a string and returns the styled text plus metadata.

```ts
const result = engine.transform("Hello, this is a test.", {
   language: "auto",
   intensity: 1,
   filterOrder: [
      "phraseReplacement",
      "dictionaryReplacement",
      "misspelling",
      "phraseInsertion",
      "numberSimplification",
      "emoji"
   ],
   filters: {
      misspelling: { enabled: true, intensity: 1 },
      emoji: { enabled: false }
   }
});
```

Result shape:

```ts
interface TransformResult {
   text: string;
   language: string;
   appliedFilters: string[];
   changes?: TextChange[];
   warnings?: string[];
}
```

## Included Filters

- `phraseReplacement`: swaps multi-token phrases from `phrases.json`.
- `dictionaryReplacement`: replaces individual words from `replacements.json`.
- `misspelling`: applies curated misspellings and regex rules.
- `phraseInsertion`: inserts filler words and phrases around sentence positions or NLP matches.
- `numberSimplification`: fuzzes numeric tokens in a deterministic way.
- `emoji`: adds optional emoji or sentence-tail decorations.

Each filter can be enabled, disabled, reordered, and given its own intensity.

## Languages

The package includes English and Russian language packs:

```ts
import { englishPack, russianPack } from "um-typos";
```

Use `language: "auto"` to let the detector choose a language, or pass a language code directly:

```ts
engine.transform("Это обычный текст на русском.", {
   language: "ru",
   intensity: 1
});
```

## Data Layout

Language data lives under `data/<language>/`:

```text
data/
  en/
    phrases.json
    replacements.json
    misspellings.json
    insertions.json
    numbers.json
    emoji.json
    language-hints.json
    morphology.json
    regex-rules.json
  ru/
    phrases.json
    replacements.json
    misspellings.json
    insertions.json
    numbers.json
    emoji.json
    language-hints.json
    morphology.json
    regex-rules.json
```

The JSON files are data only. Filters receive data through language packs and transformation context, so the core engine does not read files directly.

Historical source material and the original prototype implementation are kept under `reference/`.

## Development

Build the library:

```sh
npm run build
```

Run the smoke tests:

```sh
npm test
```

The ESM bundle is emitted to `dist/index.js`, and TypeScript declarations are emitted to `dist/types`.

## Architecture

```text
input text
-> resolve or detect language
-> segment text into tokens
-> build a TextDocument
-> run enabled filters in order
-> render the document back to text
-> return text, applied filters, and debug changes
```

Third-party NLP and language tools are wrapped behind adapters:

- `compromise` for English NLP features;
- `ru-compromise` for Russian NLP where available;
- `franc` for language detection;
- `Intl.Segmenter` through an adapter for Unicode-safe segmentation.

## Adding A Language

1. Add data files under `data/<code>/`.
2. Create a `LanguagePack` with aliases, dictionaries, optional adapters, filters, and rules.
3. Register it with `engine.registerLanguage(myLanguagePack)`.

## Adding A Filter

```ts
import type { Filter } from "um-typos";

export const myFilter: Filter = {
   id: "myFilter",
   phase: "lexical",
   languages: "any",
   apply(document, context) {
      return document;
   }
};
```

Filters should be independent and safe to skip. If required data or NLP features are missing, a filter should return the original document unchanged.
