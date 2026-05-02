// English moo data controls cow-like insertions around words and sentences.
export const EN_MOO_DATA = {
   beforeWord: ["moo, ", "muuuh, ", "mmmoo... "],
   afterWord: [" moo", " muu", " mmm"],
   sentenceTails: ["moo", "mrrmoo", "muuuh"],
   echoJoiners: ["... ", "-moo-"],
   vowelPattern: /[aeiou]/i,
   probabilities: {
      beforeWord: 0.16,
      afterWord: 0.18,
      sentenceTail: 0.28,
      stretchVowel: 0.24,
      echoWord: 0.14
   },
   minWordLength: 4,
   minStretchWordLength: 5,
   maxStretch: 9
};
