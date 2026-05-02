import { createFrancLanguageDetectorAdapter } from "../adapters/franc.js";
import { createIntlSegmenterAdapter } from "../adapters/intlSegmenter.js";
import { buildDocument, renderDocument } from "./text.js";
import { resolveLanguage } from "./language.js";
import { createDeterministicRandom } from "./random.js";
import { FilterRegistry, LanguageRegistry } from "./registry.js";
import type {
   EngineConfig,
   Filter,
   FilterConfig,
   LanguagePack,
   TextChange,
   TextTransformEngine,
   TransformContext,
   TransformOptions,
   TransformResult
} from "./types.js";

const PHASE_ORDER = new Map([
   ["pre", 0],
   ["lexical", 1],
   ["syntactic", 2],
   ["post", 3]
]);

export function createTextTransformEngine(config: EngineConfig): TextTransformEngine {
   return new UmTyposEngine(config);
}

class UmTyposEngine implements TextTransformEngine {
   private readonly languageRegistry = new LanguageRegistry();
   private readonly filterRegistry = new FilterRegistry();
   private readonly detector;
   private readonly defaultSegmenter;

   constructor(private readonly config: EngineConfig) {
      this.detector = config.detector ?? createFrancLanguageDetectorAdapter();
      this.defaultSegmenter = config.segmenter ?? createIntlSegmenterAdapter();

      for (let filter of config.filters ?? []) {
         this.registerFilter(filter);
      }

      for (let language of config.languages ?? []) {
         this.registerLanguage(language);
      }
   }

   transform(text: string, options: TransformOptions = {}): TransformResult {
      let defaultLanguage = this.resolveDefaultLanguage();
      let resolved = resolveLanguage(text, options.language ?? "auto", defaultLanguage, this.languageRegistry, this.detector);
      let language = resolved.language;
      let segmenter = language.segmenter ?? this.defaultSegmenter;
      let document = buildDocument(text, language.code, segmenter);
      let warnings = [...resolved.warnings];
      let changes: TextChange[] = [];
      let appliedFilters: string[] = [];
      let filterOrder = this.resolveFilterOrder(options.filterOrder);

      for (let filter of filterOrder) {
         if (!isFilterAllowedForLanguage(filter, language.code)) continue;

         let filterConfig = normalizeFilterConfig(options.filters?.[filter.id], Boolean(options.filters));
         if (!filterConfig.enabled) continue;

         let context: TransformContext = {
            seed: this.config.seed,
            intensity: normalizeIntensity(options.intensity, 1),
            language: language.code,
            rng: createDeterministicRandom(`${this.config.seed}:${language.code}`),
            options: options.options ?? {},
            resources: {
               segmenter,
               nlp: language.nlp,
               dictionaries: language.dictionaries,
               rules: language.rules
            },
            filter: {
               id: filter.id,
               intensity: normalizeIntensity(filterConfig.intensity, 1),
               probability: normalizeIntensity(filterConfig.probability, 1),
               options: filterConfig.options ?? {}
            },
            changes,
            warnings,
            recordChange(change) {
               changes.push(change);
            }
         };

         let before = renderDocument(document);
         document = filter.apply(document, context);
         let after = renderDocument(document);
         if (before !== after || context.changes.some((change) => change.filterId === filter.id)) {
            appliedFilters.push(filter.id);
         }
      }

      return {
         text: renderDocument(document),
         language: language.code,
         appliedFilters,
         changes: changes.length > 0 ? changes : undefined,
         warnings: warnings.length > 0 ? warnings : undefined
      };
   }

   registerLanguage(languagePack: LanguagePack): void {
      this.languageRegistry.register(languagePack);
      for (let filter of languagePack.filters) {
         this.registerFilter(filter);
      }
   }

   registerFilter(filter: Filter): void {
      this.filterRegistry.register(filter);
   }

   getLanguages(): LanguagePack[] {
      return this.languageRegistry.all();
   }

   getFilters(): Filter[] {
      return this.filterRegistry.all();
   }

   private resolveDefaultLanguage(): LanguagePack {
      let configured = this.languageRegistry.resolve(this.config.defaultLanguage);
      if (configured) return configured;

      let first = this.languageRegistry.all()[0];
      if (!first) {
         throw new Error("um-typos requires at least one registered language pack.");
      }

      return first;
   }

   private resolveFilterOrder(configuredOrder?: string[]): Filter[] {
      let filters = this.filterRegistry.all();
      if (configuredOrder && configuredOrder.length > 0) {
         return configuredOrder.map((id) => this.filterRegistry.resolve(id)).filter((filter): filter is Filter => Boolean(filter));
      }

      return [...filters].sort((left, right) => {
         let phaseDelta = (PHASE_ORDER.get(left.phase) ?? 99) - (PHASE_ORDER.get(right.phase) ?? 99);
         if (phaseDelta !== 0) return phaseDelta;
         return filters.indexOf(left) - filters.indexOf(right);
      });
   }
}

function normalizeFilterConfig(config: Partial<FilterConfig> | undefined, hasExplicitFilterConfig: boolean): FilterConfig {
   return {
      enabled: config?.enabled ?? !hasExplicitFilterConfig,
      intensity: config?.intensity,
      probability: config?.probability,
      options: config?.options
   };
}

function normalizeIntensity(value: number | undefined, fallback: number): number {
   if (!Number.isFinite(value)) return fallback;
   return Math.max(0, value ?? fallback);
}

function isFilterAllowedForLanguage(filter: Filter, language: string): boolean {
   if (!filter.languages || filter.languages === "any") return true;
   return filter.languages.includes(language);
}
