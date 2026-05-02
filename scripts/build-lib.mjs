import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");

await mkdir(DIST_DIR, { recursive: true });
await rm(path.join(DIST_DIR, "index.js"), { force: true });

await build({
   entryPoints: [path.join(ROOT, "src/index.ts")],
   outfile: path.join(DIST_DIR, "index.js"),
   bundle: true,
   format: "esm",
   platform: "node",
   target: ["node20"],
   sourcemap: true,
   legalComments: "eof",
   logLevel: "info"
});
