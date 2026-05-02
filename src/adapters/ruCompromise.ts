import nlp from "ru-compromise";
import type { NlpAdapter, NlpDocument } from "../core/types.js";

export function createRuCompromiseAdapter(): NlpAdapter {
   return {
      id: "ru-compromise",
      capabilities: ["match", "pos", "russian"],
      analyze(text: string): NlpDocument {
         let document = nlp(text);
         return {
            has(pattern: string): boolean {
               return document.has(pattern);
            },
            match(pattern: string): string[] {
               return document.match(pattern).out("array");
            }
         };
      }
   };
}
