// Russian moo data adds Cyrillic-friendly moo sounds and vowel stretching.
export const RU_MOO_DATA = {
   beforeWord: ["муу, ", "ммуу... ", "му-у, "],
   afterWord: [" му", " муу", " м-м"],
   sentenceTails: ["муу", "му-у-у", "ммму"],
   echoJoiners: ["... ", "-му-"],
   vowelPattern: /[аеёиоуыэюя]/i,
   probabilities: {
      beforeWord: 0.15,
      afterWord: 0.17,
      sentenceTail: 0.26,
      stretchVowel: 0.32,
      echoWord: 0.12
   },
   minWordLength: 4,
   minStretchWordLength: 5,
   maxStretch: 12
};
