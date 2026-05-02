import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");
const OUTFILE = path.join(DIST_DIR, "mispell-linguistic-test.user.js");

const USERSCRIPT_HEADER = `// ==UserScript==
// @name         Mispell Linguistic Test
// @namespace    https://github.com/Gardamuse/mispell
// @version      0.4.0
// @description  Lightweight page text transformation userscript for linguistic experiments.
// @author       Gardamuse / local userscript adaptation
// @match        *://*/*
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
`;

await mkdir(DIST_DIR, { recursive: true });

await build({
   entryPoints: [path.join(ROOT, "src/index.js")],
   outfile: OUTFILE,
   bundle: true,
   format: "iife",
   platform: "browser",
   target: ["es2020"],
   minify: false,
   sourcemap: false,
   legalComments: "none",
   banner: {
      js: USERSCRIPT_HEADER
   }
});

console.log(`Built ${path.relative(ROOT, OUTFILE)}`);
