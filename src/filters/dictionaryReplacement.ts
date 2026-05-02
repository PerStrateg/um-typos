import { cloneDocument, pickWeightedVariant, restoreCase, shouldApply, tokenChangeKey } from "../core/text.js";
import type { DictionaryData, Filter, ReplacementEntry, TextDocument, TransformContext } from "../core/types.js";

export const dictionaryReplacementFilter: Filter = {
   id: "dictionaryReplacement",
   phase: "lexical",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let dictionary = context.resources.dictionaries.replacements;
      if (!dictionary || dictionary.entries.length === 0) return document;

      let entries = indexDictionary(dictionary);
      let tokens = document.tokens.map((token) => {
         if (token.kind !== "word") return token;

         let entry = entries.get(token.normalized);
         if (!entry) return token;

         let baseKey = tokenChangeKey(context.filter.id, token, entry.source);
         if (!shouldApply(context, baseKey, entry.probability ?? 1)) return token;

         let variant = pickWeightedVariant(context, baseKey, entry.variants);
         if (!variant) return token;

         let nextText = restoreCase(token.text, variant.value);
         if (nextText === token.text) return token;

         context.recordChange({
            filterId: context.filter.id,
            tokenId: token.id,
            from: token.text,
            to: nextText,
            reason: `dictionary:${entry.source}`
         });

         return {
            ...token,
            text: nextText,
            normalized: nextText.toLocaleLowerCase()
         };
      });

      return cloneDocument(document, tokens);
   }
};

function indexDictionary(dictionary: DictionaryData): Map<string, ReplacementEntry> {
   return new Map(dictionary.entries.map((entry) => [entry.source.toLocaleLowerCase(), entry]));
}
