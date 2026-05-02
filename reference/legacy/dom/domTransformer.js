const SKIPPED_TAGS = new Set([
   "script",
   "style",
   "noscript",
   "template",
   "pre",
   "code",
   "kbd",
   "samp",
   "svg",
   "math",
   "canvas"
]);

const TEXT_CONTROL_SELECTOR = [
   "textarea",
   "input:not([type])",
   "input[type='email']",
   "input[type='search']",
   "input[type='tel']",
   "input[type='text']",
   "input[type='url']"
].join(",");

const EDITABLE_SELECTOR = [
   "[contenteditable='']",
   "[contenteditable='true']",
   "[contenteditable='plaintext-only']"
].join(",");

export class DomTransformer {
   constructor({ settings, transformText }) {
      this.settings = settings;
      this.transformTextWithLanguage = transformText;
      this.textRecords = new WeakMap();
      this.controlRecords = new WeakMap();
      this.decorationRecords = new WeakMap();
      this.touchedTextNodes = new Set();
      this.touchedControls = new Set();
      this.touchedDecorations = new Set();
      this.pendingRoots = new Set();
      this.pendingFrame = 0;
      this.suppressedMutationDepth = 0;
      this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
      this.handleInput = this.handleInput.bind(this);
   }

   start() {
      document.addEventListener("input", this.handleInput, true);
      if (this.settings.enabled) {
         this.applyDocument();
      }
      this.syncObserver();
   }

   updateSettings(nextSettings) {
      let previousSignature = this.getContentSignature();
      let previousEditable = this.settings.transformEditable;
      let wasEnabled = this.settings.enabled;

      this.settings = nextSettings;

      if (!this.settings.enabled) {
         this.restoreAll();
         this.syncObserver();
         return;
      }

      let contentChanged = previousSignature !== this.getContentSignature()
         || previousEditable !== this.settings.transformEditable
         || !wasEnabled;

      if (contentChanged) {
         this.restoreAll();
         this.applyDocument();
      }

      this.syncObserver();
   }

   applyDocument() {
      if (!document.body) return;
      this.applyToRoot(document.body);
   }

   applyToRoot(root) {
      if (!this.settings.enabled || !root) return;

      this.withSuppressedMutations(() => {
         this.applyToRootUnsafe(root);
      });
   }

   restoreAll() {
      this.withSuppressedMutations(() => {
         for (let node of this.touchedTextNodes) {
            let record = this.textRecords.get(node);
            if (record && node.isConnected && node.data === record.transformed) {
               node.data = record.original;
            }
            this.textRecords.delete(node);
         }

         for (let control of this.touchedControls) {
            let record = this.controlRecords.get(control);
            if (record && control.isConnected && control.value === record.transformed) {
               control.value = record.original;
            }
            this.controlRecords.delete(control);
         }

         for (let decoration of this.touchedDecorations) {
            let record = this.decorationRecords.get(decoration);
            if (record && decoration.isConnected) {
               decoration.replaceWith(document.createTextNode(record.original));
            }
            this.decorationRecords.delete(decoration);
         }

         this.touchedTextNodes.clear();
         this.touchedControls.clear();
         this.touchedDecorations.clear();
      });
   }

   disconnect() {
      document.removeEventListener("input", this.handleInput, true);
      this.observer.disconnect();
      this.pendingRoots.clear();
      cancelAnimationFrame(this.pendingFrame);
   }

   applyToRootUnsafe(root) {
      if (root.nodeType === Node.TEXT_NODE) {
         this.processTextNode(root);
         return;
      }

      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
         return;
      }

      if (root.nodeType === Node.ELEMENT_NODE && this.shouldSkipElement(root)) {
         return;
      }

      if (this.settings.transformEditable) {
         this.processTextControls(root);
      }

      this.processTextNodes(root);
   }

   processTextNodes(root) {
      let walker = document.createTreeWalker(
         root,
         NodeFilter.SHOW_TEXT,
         {
            acceptNode: (node) => {
               if (!node.data || !node.data.trim()) {
                  return NodeFilter.FILTER_REJECT;
               }

               let parentElement = node.parentElement;
               if (!parentElement || this.shouldSkipElement(parentElement)) {
                  return NodeFilter.FILTER_REJECT;
               }

               if (parentElement.closest(TEXT_CONTROL_SELECTOR)) {
                  return NodeFilter.FILTER_REJECT;
               }

               return NodeFilter.FILTER_ACCEPT;
            }
         }
      );

      let nodes = [];
      let node = walker.nextNode();
      while (node) {
         nodes.push(node);
         node = walker.nextNode();
      }

      for (let node of nodes) {
         this.processTextNode(node);
      }
   }

   processTextControls(root) {
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
         return;
      }

      if (root.nodeType === Node.ELEMENT_NODE && isTextControl(root)) {
         this.processTextControl(root);
      }

      if (typeof root.querySelectorAll !== "function") return;

      for (let control of root.querySelectorAll(TEXT_CONTROL_SELECTOR)) {
         this.processTextControl(control);
      }
   }

   processTextNode(node) {
      if (!node.parentElement || this.shouldSkipElement(node.parentElement)) return;

      let signature = this.getContentSignature();
      let record = this.textRecords.get(node);

      if (record && node.data === record.transformed && record.signature === signature) {
         return;
      }

      let original = node.data;
      if (record && node.data === record.transformed) {
         original = record.original;
      }

      if (!original.trim()) return;

      let result = this.transformText(original, { allowHtml: true });
      let transformed = result.text;
      if (result.html && node.parentNode) {
         this.replaceTextNodeWithDecoration(node, original, transformed, result.html, signature);
         return;
      }

      if (transformed === original) {
         if (record && node.data === record.transformed) {
            node.data = record.original;
         }
         this.textRecords.delete(node);
         this.touchedTextNodes.delete(node);
         return;
      }

      node.data = transformed;
      this.textRecords.set(node, { original, transformed, signature });
      this.touchedTextNodes.add(node);
   }

   replaceTextNodeWithDecoration(node, original, transformed, html, signature) {
      let decoration = document.createElement("span");
      decoration.setAttribute("data-mispell-decoration", "true");
      decoration.innerHTML = html;

      node.parentNode.replaceChild(decoration, node);
      this.decorationRecords.set(decoration, { original, transformed, signature });
      this.touchedDecorations.add(decoration);
      this.textRecords.delete(node);
      this.touchedTextNodes.delete(node);
   }

   processTextControl(control) {
      if (!isTextControl(control) || this.shouldSkipElement(control)) return;

      let signature = this.getContentSignature();
      let record = this.controlRecords.get(control);

      if (record && control.value === record.transformed && record.signature === signature) {
         return;
      }

      let original = control.value;
      if (record && control.value === record.transformed) {
         original = record.original;
      }

      if (!original.trim()) return;

      let selection = readSelection(control);
      let result = this.transformText(original, { allowHtml: false });
      let transformed = result.text;
      if (transformed === original) {
         this.controlRecords.delete(control);
         this.touchedControls.delete(control);
         return;
      }

      control.value = transformed;
      writeSelection(control, selection);
      this.controlRecords.set(control, { original, transformed, signature });
      this.touchedControls.add(control);
   }

   transformText(text, options = {}) {
      try {
         return this.transformTextWithLanguage(text, {
            ...this.settings,
            pageLanguage: getPageLanguage()
         }, options);
      } catch (error) {
         console.error("[Mispell userscript] transform failed", error);
         return { text, html: null };
      }
   }

   shouldSkipElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      if (element.closest("[data-mispell-userscript-root='true']")) return true;
      if (element.closest("[data-mispell-decoration='true']")) return true;
      if (element.closest("[hidden],[aria-hidden='true']")) return true;

      let tagName = element.tagName.toLowerCase();
      if (SKIPPED_TAGS.has(tagName)) return true;
      if (isPasswordOrHiddenInput(element)) return true;

      if (!this.settings.transformEditable && isEditableContext(element)) {
         return true;
      }

      return false;
   }

   syncObserver() {
      this.observer.disconnect();

      if (!this.settings.enabled || !this.settings.dynamicUpdates || !document.body) {
         return;
      }

      this.observer.observe(document.body, {
         childList: true,
         characterData: true,
         subtree: true
      });
   }

   handleMutations(mutations) {
      if (this.suppressedMutationDepth > 0 || !this.settings.enabled || !this.settings.dynamicUpdates) {
         return;
      }

      for (let mutation of mutations) {
         if (mutation.type === "characterData") {
            this.queueRoot(mutation.target);
            continue;
         }

         for (let node of mutation.addedNodes) {
            this.queueRoot(node);
         }
      }
   }

   queueRoot(root) {
      if (!root || isInsideUserscriptRoot(root) || isInsideMispellDecoration(root)) return;

      this.pendingRoots.add(root);
      if (this.pendingFrame) return;

      this.pendingFrame = requestAnimationFrame(() => {
         this.pendingFrame = 0;
         let roots = Array.from(this.pendingRoots);
         this.pendingRoots.clear();

         for (let root of roots) {
            this.applyToRoot(root);
         }
      });
   }

   handleInput(event) {
      if (!this.settings.enabled || !this.settings.transformEditable || !this.settings.transformInputRealtime) {
         return;
      }

      let target = event.target;
      if (isInsideUserscriptRoot(target)) return;

      if (isTextControl(target)) {
         this.withSuppressedMutations(() => this.processTextControl(target));
         return;
      }

      let editableRoot = target.closest?.(EDITABLE_SELECTOR);
      if (editableRoot) {
         this.applyToRoot(editableRoot);
      }
   }

   withSuppressedMutations(callback) {
      this.suppressedMutationDepth += 1;
      try {
         callback();
      } finally {
         setTimeout(() => {
            this.suppressedMutationDepth = Math.max(0, this.suppressedMutationDepth - 1);
         }, 0);
      }
   }

   getContentSignature() {
      return [
         this.settings.language,
         Number(this.settings.intensity).toFixed(3),
         getFilterSignature(this.settings.filters),
         this.settings.transformEditable ? "editable" : "read-only"
      ].join(":");
   }
}

function isTextControl(element) {
   return Boolean(element?.matches?.(TEXT_CONTROL_SELECTOR));
}

function isEditableContext(element) {
   return Boolean(
      element.closest(EDITABLE_SELECTOR)
      || element.matches(TEXT_CONTROL_SELECTOR)
   );
}

function isPasswordOrHiddenInput(element) {
   if (!element.matches?.("input")) return false;
   let type = (element.getAttribute("type") || "text").toLowerCase();
   return type === "password" || type === "hidden";
}

function isInsideUserscriptRoot(node) {
   if (!node) return false;
   let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
   return Boolean(element?.closest("[data-mispell-userscript-root='true']"));
}

function isInsideMispellDecoration(node) {
   if (!node) return false;
   let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
   return Boolean(element?.closest("[data-mispell-decoration='true']"));
}

function getPageLanguage() {
   return document.documentElement.getAttribute("lang") || "";
}

function readSelection(control) {
   try {
      return {
         start: control.selectionStart,
         end: control.selectionEnd,
         direction: control.selectionDirection
      };
   } catch (error) {
      return null;
   }
}

function writeSelection(control, selection) {
   if (!selection || typeof control.setSelectionRange !== "function") return;

   try {
      let start = Math.min(selection.start, control.value.length);
      let end = Math.min(selection.end, control.value.length);
      control.setSelectionRange(start, end, selection.direction || "none");
   } catch (error) {
      // Some controls expose selection fields but reject setSelectionRange.
   }
}

function getFilterSignature(filters = {}) {
   let order = Array.isArray(filters.order) ? filters.order : [];
   let enabledById = filters.enabledById || {};
   let settingsById = filters.settingsById || {};
   return order.map((filterId) => {
      return filterId
         + ":" + (enabledById[filterId] ? "1" : "0")
         + ":" + JSON.stringify(settingsById[filterId] || {});
   }).join("|");
}
