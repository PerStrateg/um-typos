import { SettingsPanel } from "./app/ui.js";
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, saveSettings } from "./app/settings.js";
import { DomTransformer } from "./dom/domTransformer.js";
import { FILTERS } from "./filters/registry.js";
import { transformPipeline } from "./filters/pipeline.js";
import { LANGUAGE_CHOICES } from "./languages/registry.js";

let settings = loadSettings(LANGUAGE_CHOICES);
let transformer = null;
let panel = null;

function start() {
   transformer = new DomTransformer({
      settings,
      transformText: (text, activeSettings, options) => transformPipeline(text, activeSettings, options)
   });

   panel = new SettingsPanel({
      settings,
      languageChoices: LANGUAGE_CHOICES,
      filters: FILTERS,
      onSettingsChange: updateSettings,
      onRestore: () => transformer.restoreAll()
   });

   registerMenuCommands();
   transformer.start();
}

function updateSettings(patch) {
   settings = sanitizeSettings({
      ...settings,
      ...patch
   }, LANGUAGE_CHOICES);

   saveSettings(settings);
   panel?.update(settings);
   transformer?.updateSettings(settings);
}

function registerMenuCommands() {
   if (typeof GM_registerMenuCommand !== "function") return;

   GM_registerMenuCommand("Mispell: show or hide settings", () => {
      updateSettings({ panelVisible: !settings.panelVisible });
   });

   GM_registerMenuCommand("Mispell: enable or disable", () => {
      updateSettings({ enabled: !settings.enabled });
   });

   GM_registerMenuCommand("Mispell: restore original text", () => {
      transformer?.restoreAll();
   });

   GM_registerMenuCommand("Mispell: reset settings", () => {
      updateSettings(DEFAULT_SETTINGS);
   });
}

if (document.readyState === "loading") {
   document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
   start();
}
