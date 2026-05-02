// English language patterns and detection data shared by all filters.
export const EN_LANGUAGE = {
   id: "en",
   label: "English",
   aliases: ["en"],
   patterns: {
      word: /[A-Za-z]+(?:'[A-Za-z]+)?/g,
      letter: /[A-Za-z]/gu,
      latin: /[A-Za-z]/g,
      cyrillic: /[А-Яа-яЁё]/g
   },
   detection: {
      commonWords: new Set([
         "the",
         "and",
         "that",
         "this",
         "with",
         "you",
         "for",
         "are",
         "was",
         "were",
         "have",
         "from",
         "not"
      ]),
      baseScore: 0.2,
      commonHitWeight: 0.18,
      maxCommonBoost: 0.55,
      longTextMinLetters: 24,
      longTextBoost: 0.15
   }
};
