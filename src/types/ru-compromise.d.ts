declare module "ru-compromise" {
   type RuCompromiseDocument = {
      has(pattern: string): boolean;
      match(pattern: string): RuCompromiseDocument;
      out(format: "array"): string[];
      text(): string;
   };

   export default function nlp(text: string): RuCompromiseDocument;
}
