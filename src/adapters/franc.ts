import { franc } from "franc";
import type { LanguageDetectorAdapter } from "../core/types.js";

export function createFrancLanguageDetectorAdapter(): LanguageDetectorAdapter {
   return {
      detect(text, options = {}) {
         let trimmed = text.trim();
         let minLength = options.minLength ?? 10;
         if (trimmed.length < minLength) return "und";

         try {
            return franc(trimmed, {
               only: options.only && options.only.length > 0 ? options.only : undefined,
               minLength
            });
         } catch {
            return "und";
         }
      }
   };
}
