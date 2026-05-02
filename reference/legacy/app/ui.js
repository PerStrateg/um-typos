export class SettingsPanel {
   constructor({ settings, languageChoices, filters, onSettingsChange, onRestore }) {
      this.settings = settings;
      this.languageChoices = languageChoices;
      this.filters = filters;
      this.onSettingsChange = onSettingsChange;
      this.onRestore = onRestore;
      this.draggedFilterId = null;
      this.pendingDragOrder = null;
      this.preserveFilterList = false;
      this.host = document.createElement("div");
      this.host.setAttribute("data-mispell-userscript-root", "true");
      this.host.style.position = "fixed";
      this.host.style.right = "14px";
      this.host.style.bottom = "14px";
      this.host.style.zIndex = "2147483647";

      this.shadow = this.host.attachShadow({ mode: "open" });
      this.render();
      document.documentElement.appendChild(this.host);
      this.update(settings);
   }

   update(settings) {
      this.settings = settings;
      this.host.style.display = settings.panelVisible ? "block" : "none";

      this.setChecked("enabled", settings.enabled);
      this.setChecked("dynamicUpdates", settings.dynamicUpdates);
      this.setChecked("transformEditable", settings.transformEditable);
      this.setChecked("transformInputRealtime", settings.transformInputRealtime);
      this.setValue("language", settings.language);
      this.setValue("intensity", settings.intensity);
      if (this.shouldPreserveFilterList()) {
         this.syncFilterControlValues(settings);
      } else {
         this.renderFilterList();
      }

      let intensityOutput = this.shadow.querySelector("[data-output='intensity']");
      if (intensityOutput) {
         intensityOutput.textContent = Number(settings.intensity).toFixed(2);
      }

      let realtimeInput = this.shadow.querySelector("[data-setting='transformInputRealtime']");
      if (realtimeInput) {
         realtimeInput.disabled = !settings.transformEditable;
      }
   }

   render() {
      this.shadow.innerHTML = `
         <style>
            :host {
               all: initial;
               color-scheme: light dark;
               font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .panel {
               width: 318px;
               max-height: min(720px, calc(100vh - 28px));
               box-sizing: border-box;
               border: 1px solid rgba(128, 140, 160, 0.28);
               border-radius: 10px;
               background: color-mix(in srgb, Canvas 94%, CanvasText 6%);
               color: CanvasText;
               box-shadow: 0 18px 46px rgba(0, 0, 0, 0.26);
               padding: 9px;
               font-size: 11px;
               line-height: 1.3;
               overflow: auto;
               backdrop-filter: blur(14px);
            }

            .header,
            .top-grid,
            .row,
            .actions,
            .filter-head,
            .control-row {
               display: flex;
               align-items: center;
               gap: 8px;
            }

            .header {
               justify-content: space-between;
               margin-bottom: 8px;
            }

            .brand {
               display: grid;
               gap: 1px;
            }

            .title {
               font-weight: 750;
               font-size: 13px;
               letter-spacing: 0;
            }

            .subtitle {
               color: color-mix(in srgb, CanvasText 62%, Canvas 38%);
               font-size: 10px;
            }

            .top-grid {
               align-items: stretch;
               gap: 5px;
               margin-bottom: 6px;
            }

            .top-grid label {
               flex: 1;
            }

            .row {
               justify-content: space-between;
               min-height: 26px;
            }

            .compact-row {
               border: 1px solid rgba(128, 140, 160, 0.22);
               border-radius: 7px;
               padding: 4px 6px;
               background: color-mix(in srgb, Canvas 88%, CanvasText 12%);
            }

            label {
               cursor: default;
            }

            select,
            input[type="range"] {
               width: 126px;
            }

            select {
               min-height: 24px;
               border: 1px solid rgba(128, 140, 160, 0.34);
               border-radius: 6px;
               background: Canvas;
               color: CanvasText;
               font: inherit;
            }

            input[type="range"] {
               accent-color: #1b998b;
            }

            input[type="checkbox"] {
               width: 15px;
               height: 15px;
               accent-color: #1b998b;
            }

            button {
               appearance: none;
               border: 1px solid rgba(128, 140, 160, 0.32);
               border-radius: 6px;
               background: color-mix(in srgb, ButtonFace 88%, CanvasText 12%);
               color: ButtonText;
               font: inherit;
               padding: 4px 7px;
               cursor: pointer;
            }

            button:hover {
               background: color-mix(in srgb, ButtonFace 78%, CanvasText 22%);
            }

            button:disabled {
               cursor: default;
               opacity: 0.42;
            }

            .icon-button {
               width: 24px;
               height: 24px;
               padding: 0;
               line-height: 1;
            }

            .actions {
               justify-content: flex-end;
               margin-top: 8px;
            }

            .section-title {
               display: flex;
               align-items: center;
               justify-content: space-between;
               margin: 8px 0 5px;
               font-weight: 750;
            }

            .filter-list {
               display: grid;
               gap: 4px;
            }

            .filter-card {
               border: 1px solid rgba(128, 140, 160, 0.24);
               border-radius: 7px;
               background: color-mix(in srgb, Canvas 90%, CanvasText 10%);
               overflow: hidden;
               transition: border-color 120ms ease, background 120ms ease, opacity 120ms ease;
            }

            .filter-card.is-dragging {
               opacity: 0.62;
               border-color: #1b998b;
            }

            .filter-head {
               min-height: 28px;
               padding: 4px 6px;
               cursor: pointer;
               user-select: none;
            }

            .filter-head:hover {
               background: color-mix(in srgb, Canvas 84%, CanvasText 16%);
            }

            .drag-handle {
               width: 14px;
               text-align: center;
               opacity: 0.62;
               cursor: ns-resize;
               user-select: none;
            }

            .drag-handle:active {
               cursor: grabbing;
            }

            .filter-name {
               flex: 1;
               min-width: 0;
               font-weight: 650;
               overflow: hidden;
               text-overflow: ellipsis;
               white-space: nowrap;
            }

            .filter-chevron {
               color: color-mix(in srgb, CanvasText 55%, Canvas 45%);
               font-size: 10px;
               width: 10px;
               text-align: center;
            }

            .filter-body {
               display: grid;
               gap: 5px;
               padding: 0 7px 7px 35px;
            }

            .control-row {
               justify-content: space-between;
               min-height: 23px;
            }

            .control-row span {
               color: color-mix(in srgb, CanvasText 72%, Canvas 28%);
            }

            .range-wrap {
               display: flex;
               align-items: center;
               gap: 5px;
            }

            .range-wrap output,
            output {
               min-width: 31px;
               text-align: right;
               font-variant-numeric: tabular-nums;
               color: color-mix(in srgb, CanvasText 70%, Canvas 30%);
            }

            .soft-divider {
               height: 1px;
               background: rgba(128, 140, 160, 0.18);
               margin: 7px 0;
            }
         </style>
         <section class="panel" aria-label="Mispell linguistic test settings">
            <div class="header">
               <div class="brand">
                  <div class="title">Mispell Test</div>
                  <div class="subtitle">filter pipeline</div>
               </div>
               <button class="icon-button" type="button" title="Hide settings" data-action="hide">x</button>
            </div>

            <div class="top-grid">
               <label class="row compact-row">
                  <span>Enabled</span>
                  <input type="checkbox" data-setting="enabled">
               </label>
               <label class="row compact-row">
                  <span>Language</span>
                  <select data-setting="language">
                     ${this.languageChoices.map((choice) => `<option value="${choice.id}">${choice.label}</option>`).join("")}
                  </select>
               </label>
            </div>

            <label class="row compact-row">
               <span>Global intensity <output data-output="intensity"></output></span>
               <input type="range" min="0" max="1" step="0.05" data-setting="intensity">
            </label>

            <div class="section-title">
               <span>Filters</span>
            </div>
            <div class="filter-list" data-filter-list></div>

            <div class="soft-divider"></div>

            <label class="row">
               <span>Dynamic text</span>
               <input type="checkbox" data-setting="dynamicUpdates">
            </label>

            <label class="row">
               <span>Edit fields</span>
               <input type="checkbox" data-setting="transformEditable">
            </label>

            <label class="row">
               <span>Realtime input</span>
               <input type="checkbox" data-setting="transformInputRealtime">
            </label>

            <div class="actions">
               <button type="button" data-action="restore">Restore</button>
            </div>
         </section>
      `;

      this.shadow.addEventListener("input", (event) => this.handleFieldChange(event));
      this.shadow.addEventListener("change", (event) => this.handleFieldChange(event));
      this.shadow.addEventListener("click", (event) => this.handleClick(event));
      this.shadow.addEventListener("dragstart", (event) => this.handleDragStart(event));
      this.shadow.addEventListener("dragover", (event) => this.handleDragOver(event));
      this.shadow.addEventListener("drop", (event) => this.handleDrop(event));
      this.shadow.addEventListener("dragend", (event) => this.handleDragEnd(event));
   }

   renderFilterList() {
      let list = this.shadow.querySelector("[data-filter-list]");
      if (!list || !this.settings.filters) return;

      let knownFilters = new Map(this.filters.map((filter) => [filter.id, filter]));
      list.innerHTML = this.settings.filters.order.map((filterId) => {
         let filter = knownFilters.get(filterId);
         if (!filter) return "";

         let checked = this.settings.filters.enabledById[filterId] ? "checked" : "";
         let expanded = this.settings.filters.expandedById[filterId] ? true : false;
         let draggingClass = this.draggedFilterId === filter.id ? " is-dragging" : "";
         let body = expanded ? this.renderFilterControls(filter) : "";

         return `
            <div class="filter-card${draggingClass}" data-filter-card="${filter.id}">
               <div class="filter-head" data-filter-row="${filter.id}" aria-expanded="${expanded ? "true" : "false"}">
                  <span class="drag-handle" draggable="true" data-drag-handle="true" title="Drag vertically to reorder">::</span>
                  <input type="checkbox" data-filter-toggle="${filter.id}" ${checked}>
                  <span class="filter-name">${escapeHtml(filter.label)}</span>
                  <span class="filter-chevron">${expanded ? "v" : ">"}</span>
               </div>
               ${body}
            </div>
         `;
      }).join("");
   }

   renderFilterControls(filter) {
      let controls = filter.controls || [];
      if (controls.length === 0) return "";

      let settings = this.settings.filters.settingsById[filter.id] || {};
      let rows = controls.map((control) => {
         let value = settings[control.key];

         if (control.type === "checkbox") {
            return `
               <label class="control-row">
                  <span>${escapeHtml(control.label)}</span>
                  <input type="checkbox" data-filter-setting="${filter.id}" data-setting-key="${control.key}" ${value ? "checked" : ""}>
               </label>
            `;
         }

         if (control.type === "range") {
            let number = Number(value);
            if (!Number.isFinite(number)) number = 0;

            return `
               <label class="control-row">
                  <span>${escapeHtml(control.label)}</span>
                  <span class="range-wrap">
                     <output>${number.toFixed(2)}</output>
                     <input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${number}" data-filter-setting="${filter.id}" data-setting-key="${control.key}" data-setting-type="number">
                  </span>
               </label>
            `;
         }

         return "";
      }).join("");

      return `<div class="filter-body">${rows}</div>`;
   }

   handleFieldChange(event) {
      let target = event.target;
      let filterSettingId = target?.getAttribute("data-filter-setting");
      if (filterSettingId) {
         this.patchFilterSetting(filterSettingId, target);
         return;
      }

      let filterId = target?.getAttribute("data-filter-toggle");
      if (filterId) {
         this.patchFilters({
            enabledById: {
               ...this.settings.filters.enabledById,
               [filterId]: target.checked
            }
         });
         return;
      }

      let key = target?.getAttribute("data-setting");
      if (!key) return;

      let value = target.type === "checkbox" ? target.checked : target.value;
      if (key === "intensity") {
         value = Number(value);
      }

      this.onSettingsChange({ [key]: value });
   }

   handleClick(event) {
      let action = event.target?.getAttribute("data-action");
      if (action === "hide") {
         this.onSettingsChange({ panelVisible: false });
         return;
      }

      if (action === "restore") {
         this.onRestore();
         return;
      }

      if (event.target?.closest?.("[data-drag-handle]") || event.target?.matches?.("input, button, select")) {
         return;
      }

      let row = event.target?.closest?.("[data-filter-row]");
      let filterId = row?.getAttribute("data-filter-row");
      if (filterId) {
         this.toggleFilterExpanded(filterId);
      }
   }

   handleDragStart(event) {
      let handle = event.target?.closest?.("[data-drag-handle]");
      if (!handle) {
         event.preventDefault();
         return;
      }

      let row = handle.closest("[data-filter-row]");
      if (!row) {
         event.preventDefault();
         return;
      }

      this.draggedFilterId = row.getAttribute("data-filter-row");
      this.pendingDragOrder = [...this.settings.filters.order];
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", this.draggedFilterId);

      let card = row.closest("[data-filter-card]");
      if (card) {
         event.dataTransfer.setDragImage(card, 18, Math.min(18, card.offsetHeight / 2));
         card.classList.add("is-dragging");
      }
   }

   handleDragOver(event) {
      let card = event.target?.closest?.("[data-filter-card]");
      if (!card || !this.draggedFilterId) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      this.moveDraggedCard(card, event.clientY);
   }

   handleDrop(event) {
      event.preventDefault();
      this.commitDraggedOrder();
   }

   handleDragEnd() {
      this.commitDraggedOrder();
   }

   toggleFilterExpanded(filterId) {
      this.patchFilters({
         expandedById: {
            ...this.settings.filters.expandedById,
            [filterId]: !this.settings.filters.expandedById[filterId]
         }
      });
   }

   moveDraggedCard(targetCard, clientY) {
      let list = this.shadow.querySelector("[data-filter-list]");
      let draggedCard = this.findFilterCard(this.draggedFilterId);
      if (!list || !draggedCard || !targetCard || draggedCard === targetCard) return;

      let rect = targetCard.getBoundingClientRect();
      let insertAfter = clientY > rect.top + rect.height / 2;
      let nextNode = insertAfter ? targetCard.nextElementSibling : targetCard;
      if (nextNode === draggedCard) return;

      list.insertBefore(draggedCard, nextNode);
      this.pendingDragOrder = this.readRenderedOrder();
   }

   commitDraggedOrder() {
      if (!this.draggedFilterId) return;

      let order = this.pendingDragOrder || this.readRenderedOrder();
      let changed = order.length > 0 && !sameOrder(order, this.settings.filters.order);

      this.draggedFilterId = null;
      this.pendingDragOrder = null;

      if (changed) {
         this.patchFilters({ order });
      } else {
         this.renderFilterList();
      }
   }

   findFilterCard(filterId) {
      let list = this.shadow.querySelector("[data-filter-list]");
      if (!list) return null;

      return Array.from(list.querySelectorAll("[data-filter-card]")).find((card) => {
         return card.getAttribute("data-filter-card") === filterId;
      }) || null;
   }

   readRenderedOrder() {
      let list = this.shadow.querySelector("[data-filter-list]");
      if (!list) return [];

      return Array.from(list.querySelectorAll("[data-filter-card]")).map((card) => {
         return card.getAttribute("data-filter-card");
      }).filter(Boolean);
   }

   patchFilterSetting(filterId, target) {
      let key = target.getAttribute("data-setting-key");
      if (!key) return;

      let value = target.type === "checkbox" ? target.checked : target.value;
      if (target.getAttribute("data-setting-type") === "number") {
         value = Number(value);
      }

      this.preserveFilterList = true;
      this.syncControlOutput(target, value);
      this.patchFilters({
         settingsById: {
            ...this.settings.filters.settingsById,
            [filterId]: {
               ...this.settings.filters.settingsById[filterId],
               [key]: value
            }
         }
      });
      setTimeout(() => {
         this.preserveFilterList = false;
      }, 0);
   }

   patchFilters(patch) {
      this.onSettingsChange({
         filters: {
            ...this.settings.filters,
            ...patch
         }
      });
   }

   setChecked(key, value) {
      let input = this.shadow.querySelector(`[data-setting='${key}']`);
      if (input) input.checked = Boolean(value);
   }

   setValue(key, value) {
      let input = this.shadow.querySelector(`[data-setting='${key}']`);
      if (input) input.value = String(value);
   }

   shouldPreserveFilterList() {
      let activeElement = this.shadow.activeElement;
      return this.preserveFilterList || Boolean(activeElement?.getAttribute?.("data-filter-setting"));
   }

   syncFilterControlValues(settings) {
      for (let control of this.shadow.querySelectorAll("[data-filter-setting]")) {
         let filterId = control.getAttribute("data-filter-setting");
         let key = control.getAttribute("data-setting-key");
         let value = settings.filters?.settingsById?.[filterId]?.[key];

         if (control.type === "checkbox") {
            control.checked = Boolean(value);
         } else {
            control.value = String(value);
            this.syncControlOutput(control, value);
         }
      }
   }

   syncControlOutput(control, value) {
      if (control.type === "checkbox") return;

      let number = Number(value);
      if (!Number.isFinite(number)) return;

      let output = control.closest(".range-wrap")?.querySelector("output");
      if (output) {
         output.textContent = number.toFixed(2);
      }
   }
}

function sameOrder(left, right) {
   if (left.length !== right.length) return false;

   return left.every((value, index) => value === right[index]);
}

function escapeHtml(text) {
   return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}
