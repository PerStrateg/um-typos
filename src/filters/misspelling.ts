import {
   cloneDocument,
   pickWeightedVariant,
   restoreCase,
   shouldApply,
   tokenChangeKey
} from "../core/text.js";
import type {
   DictionaryData,
   Filter,
   RegexRule,
   ReplacementEntry,
   TextDocument,
   Token,
   TransformContext
} from "../core/types.js";

export const misspellingFilter: Filter = {
   id: "misspelling",
   phase: "lexical",
   languages: "any",
   apply(document: TextDocument, context: TransformContext): TextDocument {
      let directEntries = indexDictionary(context.resources.dictionaries.misspellings);
      let regexRules = context.resources.rules.regexRules?.rules ?? [];

      if (directEntries.size === 0 && regexRules.length === 0) return document;

      let tokens = document.tokens.map((token) => {
         if (token.kind !== "word") return token;

         let direct = applyDirectMisspelling(token, directEntries.get(token.normalized), context);
         if (direct.text !== token.text) return direct;

         return applyRegexRules(token, regexRules, context);
      });

      return cloneDocument(document, tokens);
   }
};

function applyDirectMisspelling(
   token: Token,
   entry: ReplacementEntry | undefined,
   context: TransformContext
): Token {
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
      reason: `misspelling:${entry.source}`
   });

   return {
      ...token,
      text: nextText,
      normalized: nextText.toLocaleLowerCase()
   };
}

function applyRegexRules(token: Token, rules: RegexRule[], context: TransformContext): Token {
   let currentText = token.text;
   let currentNormalized = token.normalized;

   for (let rule of rules) {
      let regex = compileRule(rule);
      let transformed = currentNormalized.replace(regex, rule.replacement);
      if (transformed === currentNormalized) continue;

      let baseKey = tokenChangeKey(context.filter.id, token, rule.id);
      if (!shouldApply(context, baseKey, rule.probability ?? 1)) continue;

      let nextText = restoreCase(currentText, transformed);
      context.recordChange({
         filterId: context.filter.id,
         tokenId: token.id,
         from: currentText,
         to: nextText,
         reason: `regex:${rule.id}`
      });

      currentText = nextText;
      currentNormalized = nextText.toLocaleLowerCase();
   }

   if (currentText === token.text) return token;

   return {
      ...token,
      text: currentText,
      normalized: currentNormalized
   };
}

function indexDictionary(dictionary: DictionaryData | undefined): Map<string, ReplacementEntry> {
   if (!dictionary) return new Map();
   return new Map(dictionary.entries.map((entry) => [entry.source.toLocaleLowerCase(), entry]));
}

function compileRule(rule: RegexRule): RegExp {
   let flags = rule.flags ?? "giu";
   if (!flags.includes("u")) flags += "u";
   return new RegExp(rule.pattern, flags);
}
