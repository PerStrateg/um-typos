import nlp from "compromise";
import type { NlpAdapter, NlpDocument } from "../core/types.js";

export function createCompromiseAdapter(): NlpAdapter {
   return {
      id: "compromise",
      capabilities: ["match", "pos", "sentences", "english"],
      analyze(text: string): NlpDocument {
         let document = nlp(text);
         return {
            has(pattern: string): boolean {
               return document.has(pattern);
            },
            match(pattern: string): string[] {
               return document.match(pattern).out("array") as string[];
            }
         };
      }
   };
}
