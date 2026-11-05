import { STOPWORDS, isLaugh } from './stopwords';

/**
 * One emoji = an Extended_Pictographic char with optional variation selector / skin tone,
 * optionally joined with ZWJ into sequences (👨‍👩‍👧), or a pair of regional indicators (flags).
 */
export const EMOJI_RE = /\p{RI}\p{RI}|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/gu;

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
/** Letters (any script) plus combining marks so Devanagari matras stay attached. */
const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}\p{N}'’]*/gu;
/** Skin-tone modifiers and plain symbols that aren't fun to show on their own. */
const BORING_EMOJI = new Set(['©', '®', '™', '‼', '↩', '↪', '▶', '◀', '⬆', '⬇', '➡', '⬅', '↔', '↕', '✔', '☑', '〰', '〽', '*', '#']);

export function extractEmojis(text: string, into: Map<string, number>): number {
  let n = 0;
  for (const m of text.matchAll(EMOJI_RE)) {
    const e = m[0].replace(/️/g, '');
    if (BORING_EMOJI.has(e)) continue;
    into.set(e, (into.get(e) ?? 0) + 1);
    n++;
  }
  return n;
}

export function countWords(text: string): number {
  let n = 0;
  const cleaned = text.replace(URL_RE, ' ');
  for (const _ of cleaned.matchAll(WORD_RE)) n++;
  return n;
}

/** Count interesting words. Returns the total word count (incl. stopwords) for the novel comparison. */
export function extractWords(
  text: string,
  into: Map<string, number>,
  counters: { laughs: number } = { laughs: 0 },
  extraStop?: ReadonlySet<string>,
): number {
  let total = 0;
  const cleaned = text.replace(URL_RE, ' ').toLowerCase();
  for (const m of cleaned.matchAll(WORD_RE)) {
    total++;
    const w = m[0].replace(/['’]+$/g, '').replace(/['’]/g, "'");
    if (w.length < 2) continue;
    if (isLaugh(w) || w === 'haha' || w === 'lol') {
      counters.laughs++;
      continue;
    }
    if (STOPWORDS.has(w) || STOPWORDS.has(w.replace(/'/g, ''))) continue;
    if (extraStop?.has(w)) continue;
    // Stretched words ("sooooo", "yaaaar") -> collapse 3+ repeats.
    const norm = w.replace(/(.)\1{2,}/gu, '$1$1');
    if (STOPWORDS.has(norm)) continue;
    into.set(norm, (into.get(norm) ?? 0) + 1);
  }
  return total;
}

/** Display form: put back VS16 on BMP symbols (❤ -> ❤️) so they render as colour emoji. */
export function displayEmoji(e: string): string {
  const cps = [...e];
  return cps.length === 1 && cps[0]!.codePointAt(0)! < 0x1f000 ? e + '\uFE0F' : e;
}

export function topN<K>(map: Map<K, number>, n: number): { key: K; count: number }[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}
