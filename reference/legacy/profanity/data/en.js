// English mild profanity data avoids explicit language while adding sentence bite.
export const EN_PROFANITY_DATA = {
   interjections: ["heck", "dang", "drat", "blast", "gosh"],
   prefixes: ["Heck, ", "Dang, ", "Gosh, "],
   tails: ["heck", "dang it", "for crying out loud"],
   probabilities: {
      prefix: 0.18,
      midSentence: 0.18,
      tail: 0.22
   },
   minWords: 4
};
