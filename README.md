# um-typos

`um-typos` is a small TypeScript library for turning clean text into a more casual, typo-heavy, filler-word style.

It can add phrases like `um`, `like`, and `basically`, replace words with curated variants, apply common misspellings, soften or scramble numbers, and add optional emoji endings. The output is deterministic: the same text, seed, language, and settings produce the same result.

## Demo

The GitHub Pages demo is a live presentation of the library:

https://perstrateg.github.io/um-typos/

It shows source text next to processed text, presets, per-filter settings, generated sample text, and the list of changes applied by the engine.

## Install

```sh
npm install um-typos
```

## Quick Example

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
   "This library transforms text and keeps the result repeatable.",
   {
      language: "en",
      intensity: 0.85
   }
);

console.log(result.text);
```

## Languages

The package currently includes English and Russian language packs.

## Inspiration

This project is inspired by [Gardamuse/mispell](https://github.com/Gardamuse/mispell). `um-typos` keeps the playful text transformation idea and rebuilds it as a reusable library with language packs, presets, and a browser demo.

## Development

```sh
npm install
npm test
npm run build:pages
```
