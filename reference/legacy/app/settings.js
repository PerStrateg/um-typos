import { normalizeFilterSettings } from "../filters/registry.js";

export const STORAGE_KEY = "mispellLinguisticTest.settings.v4";
const LEGACY_STORAGE_KEYS = [
   "mispellLinguisticTest.settings.v3",
   "mispellLinguisticTest.settings.v2",
   "mispellLinguisticTest.settings.v1"
];

export const DEFAULT_SETTINGS = {
   enabled: true,
   panelVisible: true,
   language: "auto",
   intensity: 0.75,
   dynamicUpdates: true,
   transformEditable: false,
   transformInputRealtime: false,
   filters: normalizeFilterSettings()
};

export function loadSettings(languageChoices) {
   return sanitizeSettings({
      ...DEFAULT_SETTINGS,
      ...readStoredSettings()
   }, languageChoices);
}

export function saveSettings(settings) {
   if (typeof GM_setValue === "function") {
      GM_setValue(STORAGE_KEY, settings);
      return;
   }

   try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
   } catch (error) {
      // Storage is optional; in-memory settings still keep the script usable.
   }
}

export function sanitizeSettings(settings, languageChoices = []) {
   let allowedLanguages = languageChoices.map((choice) => choice.id);
   let language = typeof settings.language === "string"
      ? settings.language
      : DEFAULT_SETTINGS.language;

   if (allowedLanguages.length > 0 && !allowedLanguages.includes(language)) {
      language = DEFAULT_SETTINGS.language;
   }

   let intensity = Number(settings.intensity);
   if (!Number.isFinite(intensity)) {
      intensity = DEFAULT_SETTINGS.intensity;
   }

   let transformEditable = Boolean(settings.transformEditable);

   return {
      enabled: Boolean(settings.enabled),
      panelVisible: Boolean(settings.panelVisible),
      language,
      intensity: clamp(intensity, 0, 1),
      dynamicUpdates: Boolean(settings.dynamicUpdates),
      transformEditable,
      transformInputRealtime: transformEditable && Boolean(settings.transformInputRealtime),
      filters: normalizeFilterSettings(settings.filters)
   };
}

function readStoredSettings() {
   if (typeof GM_getValue === "function") {
      let current = parseStoredValue(GM_getValue(STORAGE_KEY, null));
      if (Object.keys(current).length > 0) return current;

      for (let key of LEGACY_STORAGE_KEYS) {
         let legacy = parseStoredValue(GM_getValue(key, null));
         if (Object.keys(legacy).length > 0) return legacy;
      }

      return {};
   }

   try {
      let current = parseStoredValue(window.localStorage.getItem(STORAGE_KEY));
      if (Object.keys(current).length > 0) return current;

      for (let key of LEGACY_STORAGE_KEYS) {
         let legacy = parseStoredValue(window.localStorage.getItem(key));
         if (Object.keys(legacy).length > 0) return legacy;
      }

      return {};
   } catch (error) {
      return {};
   }
}

function parseStoredValue(value) {
   if (!value) return {};
   if (typeof value === "object") return value;

   try {
      return JSON.parse(value);
   } catch (error) {
      return {};
   }
}

function clamp(value, min, max) {
   return Math.min(max, Math.max(min, value));
}
