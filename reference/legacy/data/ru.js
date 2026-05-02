// Russian language patterns, detection data, and simple NLP hints shared by all filters.
export const RU_LANGUAGE = {
   id: "ru",
   label: "Russian",
   aliases: ["ru"],
   patterns: {
      word: /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?/g,
      letter: /[А-Яа-яЁё]/gu,
      cyrillic: /[А-Яа-яЁё]/g,
      latin: /[A-Za-z]/g,
      verb: /(ть|ться|тся|ешь|ете|ет|ем|ют|ут|ит|им|ат|ят|ал|ала|али|ил|ила|или|ешься|ется)$/,
      adjective: /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ым|им|ыми|ими)$/,
      adverb: /(о|е|ски|цки|ому)$/
   },
   detection: {
      functionWords: new Set([
         "и",
         "в",
         "во",
         "не",
         "на",
         "что",
         "я",
         "с",
         "со",
         "как",
         "а",
         "то",
         "это",
         "по",
         "из",
         "за",
         "для"
      ]),
      baseScore: 0.4,
      functionHitWeight: 0.16,
      maxFunctionBoost: 0.55,
      longTextMinLetters: 18,
      longTextBoost: 0.15
   },
   nlp: {
      nonVerbExceptions: new Set([
         "ответ",
         "пакет",
         "портрет",
         "предмет",
         "привет",
         "свет",
         "совет",
         "цвет"
      ]),
      minAdverbLength: 5
   }
};
