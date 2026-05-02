import type { LanguageDetectorAdapter, LanguagePack } from "./types.js";
import { LanguageRegistry } from "./registry.js";

export interface LanguageResolution {
   language: LanguagePack;
   warnings: string[];
}

export function resolveLanguage(
   text: string,
   requestedLanguage: string | undefined,
   defaultLanguage: LanguagePack,
   registry: LanguageRegistry,
   detector: LanguageDetectorAdapter
): LanguageResolution {
   let warnings: string[] = [];

   if (requestedLanguage && requestedLanguage !== "auto") {
      let manual = registry.resolve(requestedLanguage);
      if (manual) return { language: manual, warnings };

      warnings.push(`Unknown language "${requestedLanguage}", falling back to "${defaultLanguage.code}".`);
      return { language: defaultLanguage, warnings };
   }

   let detected = detector.detect(text, {
      only: registry.detectorAliases(),
      minLength: 10
   });

   if (detected && detected !== "und") {
      let language = registry.resolve(detected);
      if (language) return { language, warnings };
      warnings.push(`Detected "${detected}", but no matching language pack is registered.`);
   } else {
      warnings.push(`Language detection returned "und"; using "${defaultLanguage.code}".`);
   }

   return { language: defaultLanguage, warnings };
}
