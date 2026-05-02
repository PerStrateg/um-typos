// Universal language data used when no specific language can be resolved.
export const UNIVERSAL_LANGUAGE = {
   id: "universal",
   label: "Universal",
   aliases: ["universal"],
   patterns: {
      word: /\p{L}{4,}(?:[-']\p{L}{2,})?/gu,
      letter: /\p{L}/gu,
      latin: /[A-Za-z]/g,
      cyrillic: /[А-Яа-яЁё]/g
   },
   detection: {
      baseScore: 0
   }
};
