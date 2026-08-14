/* ============================================================
   WriteArena — word counting
   A "word" is only counted once it has been finished with a space
   (or newline). While you're mid-word — "the quick bro" — the count
   is 2, not 3; it ticks to 3 the moment you press space. This matches
   what people expect from a live counter and stops the number from
   flickering ahead of the actual finished words.

   We also require a token to look like a real word (contain a letter),
   so stray punctuation or number soup doesn't inflate the count.
   ============================================================ */

const WORDLIKE = /[A-Za-z]/;

/** Count words that have been completed with trailing whitespace. */
export function countWords(text) {
  if (!text) return 0;
  // Only the portion up to the last whitespace is "finished". Anything
  // after the final space is a word still being typed.
  const finished = text.replace(/[^\s]*$/, "");
  const tokens = finished.split(/\s+/).filter((t) => t && WORDLIKE.test(t));
  return tokens.length;
}

/** Ratio of tokens that look like real words (letters, plausible shape). */
export function realWordRatio(text) {
  const tokens = (text || "").split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const real = tokens.filter((t) => {
    const w = t.toLowerCase().replace(/[^a-z']/g, "");
    if (!w) return false;
    if (w.length <= 2) return true;
    if (!/[aeiou]/.test(w)) return false;               // no vowels → gibberish
    if (/[^aeiou]{5,}/.test(w)) return false;           // 5+ consonants in a row
    return true;
  }).length;
  return real / tokens.length;
}
