import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = path.join(ROOT, "docs");
const ASSETS_DIR = path.join(DOCS_DIR, "assets");

await rm(ASSETS_DIR, { recursive: true, force: true });
await mkdir(ASSETS_DIR, { recursive: true });

await build({
   entryPoints: [path.join(ROOT, "src/index.ts")],
   outfile: path.join(ASSETS_DIR, "um-typos.browser.js"),
   bundle: true,
   format: "esm",
   platform: "browser",
   target: ["es2022"],
   sourcemap: true,
   legalComments: "eof",
   logLevel: "info"
});

await writeFile(path.join(DOCS_DIR, ".nojekyll"), "");
