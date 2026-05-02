// Universal moo data keeps the effect language-agnostic and readable.
export const UNIVERSAL_MOO_DATA = {
   beforeWord: ["moo ", "muu ", "mmooo "],
   afterWord: [" moo", " muu", " mmm"],
   sentenceTails: ["moo", "muu", "mmmoo"],
   echoJoiners: ["... ", "-moo-"],
   vowelPattern: /\p{L}/u,
   probabilities: {
      beforeWord: 0.14,
      afterWord: 0.16,
      sentenceTail: 0.24,
      stretchVowel: 0.18,
      echoWord: 0.1
   },
   minWordLength: 4,
   minStretchWordLength: 5,
   maxStretch: 7
};
