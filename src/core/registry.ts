import type { Filter, LanguagePack } from "./types.js";

export class LanguageRegistry {
   private readonly byCode = new Map<string, LanguagePack>();
   private readonly byAlias = new Map<string, LanguagePack>();

   register(languagePack: LanguagePack): void {
      this.byCode.set(languagePack.code, languagePack);
      this.byAlias.set(languagePack.code, languagePack);

      for (let alias of languagePack.aliases) {
         this.byAlias.set(alias.toLocaleLowerCase(), languagePack);
      }
   }

   resolve(codeOrAlias: string | undefined): LanguagePack | undefined {
      if (!codeOrAlias) return undefined;
      let normalized = codeOrAlias.toLocaleLowerCase();
      return this.byCode.get(normalized) ?? this.byAlias.get(normalized);
   }

   all(): LanguagePack[] {
      return Array.from(this.byCode.values());
   }

   detectorAliases(): string[] {
      return Array.from(this.byAlias.keys()).filter((alias) => alias.length === 3);
   }
}

export class FilterRegistry {
   private readonly byId = new Map<string, Filter>();
   private readonly order: string[] = [];

   register(filter: Filter): void {
      if (!this.byId.has(filter.id)) {
         this.order.push(filter.id);
      }
      this.byId.set(filter.id, filter);
   }

   resolve(id: string): Filter | undefined {
      return this.byId.get(id);
   }

   all(): Filter[] {
      return this.order.map((id) => this.byId.get(id)).filter((filter): filter is Filter => Boolean(filter));
   }
}
