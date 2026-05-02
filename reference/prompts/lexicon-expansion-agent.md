# Mispell 3 Data Expansion Agent Prompt

Copy the request below and send it to another coding agent when you want the Mispell 3 dictionaries expanded.

## Request To Send

You are working in this repository as a coding agent. Improve and expand Mispell 3 data without changing the core architecture.

Main goal: make the JSON dictionaries richer, better organized, and easier to maintain while keeping the library deterministic and compact.

Edit primarily:

- `data/en/*.json`
- `data/ru/*.json`
- `src/languages/*/index.ts` only if a new dictionary file is added

Only edit filter logic files if the data shape truly needs a small compatible adjustment:

- `src/filters/*.ts`
- `src/core/types.ts`

Important constraints:

- Keep DRY / KISS / YAGNI.
- Do not import files from `reference/` in runtime code.
- Do not add huge corpora directly to the default bundle.
- Prefer curated, compact entries over raw bulk data.
- Keep dictionaries as JSON data, not JavaScript logic.
- Preserve deterministic behavior: `npm test` must pass.
- If you use external resources, verify license compatibility and document the source.

Expected work:

1. Inspect the current Mispell 3 JSON formats in `data/en/` and `data/ru/`.
2. Expand English replacements, misspellings, insertions, numbers, or regex rules with compact curated entries.
3. Expand Russian replacements, misspellings, insertions, numbers, or regex rules with compact curated entries.
4. Keep probabilities conservative and stable.
5. Deduplicate all replacement arrays.
6. Avoid offensive, explicit, or domain-specific entries unless they are clearly needed and acceptable for broad use.
7. Run `npm test` and report the result.
8. Check package size with `npm pack --dry-run` if data grows meaningfully.

Quality bar:

- JSON files must stay readable and batch-processable.
- Entries should be lowercase where filters match lowercase token normalization.
- Variants should use `{ "value": "...", "weight": 1 }`.
- Regex rules should use stable `id`, `pattern`, `replacement`, and `probability`.
- Do not add a new abstraction unless the data has become hard to maintain without it.

Finish by summarizing:

- Which files changed.
- Which data sources were used.
- How many entries were added or meaningfully changed.
- The result of `npm test`.
