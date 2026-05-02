import { resolveLanguage } from "../languages/registry.js";
import { resolveFilterData } from "./shared/filterData.js";
import { FILTER_BY_ID, normalizeFilterSettings } from "./registry.js";

// Applies the enabled filter chain and returns text plus optional DOM HTML.
export function transformPipeline(text, settings = {}, options = {}) {
   let languageData = resolveLanguage(text, settings);
   let filters = normalizeFilterSettings(settings.filters);
   let contextBase = createContext(settings, languageData);
   let output = text;
   let htmlDecorator = null;

   for (let filterId of filters.order) {
      if (!filters.enabledById[filterId]) continue;

      let filter = FILTER_BY_ID.get(filterId);
      if (!filter) continue;

      let filterSettings = filters.settingsById[filterId] || {};
      let filterIntensity = Number(filterSettings.intensity);
      if (!Number.isFinite(filterIntensity)) {
         filterIntensity = 1;
      }

      let context = {
         ...contextBase,
         filterId,
         globalIntensity: contextBase.intensity,
         intensity: clamp(contextBase.intensity * clamp(filterIntensity, 0, 1), 0, 1),
         filterSettings,
         data: resolveFilterData(filter, languageData.id)
      };

      output = filter.transformText(output, context);

      if (filter.decorateHtml) {
         htmlDecorator = { filter, context };
      }
   }

   let html = null;
   if (options.allowHtml && htmlDecorator) {
      html = htmlDecorator.filter.decorateHtml(output, htmlDecorator.context);
   }

   return {
      text: output,
      html,
      language: languageData.id
   };
}

// Convenience API for tests and text-only callers.
export function transformWithFilters(text, settings = {}) {
   return transformPipeline(text, settings, { allowHtml: false }).text;
}

function createContext(settings, languageData) {
   let intensity = Number(settings.intensity);
   if (!Number.isFinite(intensity)) {
      intensity = 0.75;
   }

   return {
      intensity: clamp(intensity, 0, 1),
      random: typeof settings.random === "function" ? settings.random : Math.random,
      language: languageData.id,
      languageData
   };
}

function clamp(value, min, max) {
   return Math.min(max, Math.max(min, value));
}
