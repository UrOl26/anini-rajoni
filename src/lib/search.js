// Forgiving search: ignores capital letters and č/š/ž, and forgives small typos.
import { normalizeName } from './names.js';

function levenshtein(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (len) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

/** Does one query word match one word of the text? */
function wordMatches(q, word) {
  if (word.startsWith(q) || word.includes(q)) return true;
  const max = allowedTypos(q.length);
  if (!max) return false;
  // Compare with the start of the word (typing in progress) and the whole word.
  for (const len of [q.length - 1, q.length, q.length + 1]) {
    if (len > 0 && len <= word.length && levenshtein(q, word.slice(0, len), max) <= max) return true;
  }
  return levenshtein(q, word, max) <= max;
}

/** True if every word of the query matches some word of the text. */
export function matchesText(query, text) {
  const q = normalizeName(query).split(/[\s,.\-/]+/).filter(Boolean);
  if (!q.length) return false;
  const full = normalizeName(text);
  if (full.includes(q.join(' '))) return true;
  const words = full.split(/[\s,.\-/]+/).filter(Boolean);
  return q.every((qw) => words.some((w) => wordMatches(qw, w)));
}
