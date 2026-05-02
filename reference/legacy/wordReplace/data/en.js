// English word replacement data maps regexp matches to replacement choices.
export const EN_WORD_REPLACE_DATA = {
   replacements: [
      [/\bexcellent\b/gi, ["pretty great", "kinda amazing"], 0.55],
      [/\bdifficult\b/gi, ["tricky", "a whole thing"], 0.45],
      [/\bimportant\b/gi, ["big-deal", "super relevant"], 0.45],
      [/\bhello\b/gi, ["hey", "hiya"], 0.5],
      [/\btest\b/gi, ["experiment", "trial"], 0.8]
   ]
};
