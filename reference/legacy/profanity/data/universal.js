// Universal mild profanity data uses broad non-obscene interjections.
export const UNIVERSAL_PROFANITY_DATA = {
   interjections: ["ugh", "bah", "meh", "tsk"],
   prefixes: ["Ugh, ", "Bah, "],
   tails: ["ugh", "bah", "tsk"],
   probabilities: {
      prefix: 0.16,
      midSentence: 0.16,
      tail: 0.2
   },
   minWords: 4
};
