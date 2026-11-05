import { dayIndexToISO } from './dates';

export interface Run {
  days: number;
  start: number;
  end: number;
}

/** Longest run of consecutive day indexes. */
export function longestRun(days: Iterable<number>): Run | null {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (!sorted.length) return null;
  let best: Run = { days: 1, start: sorted[0]!, end: sorted[0]! };
  let start = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1]! + 1) start = sorted[i]!;
    const len = sorted[i]! - start + 1;
    if (len > best.days) best = { days: len, start, end: sorted[i]! };
  }
  return best;
}

export function runToISO(r: Run): { start: string; end: string } {
  return { start: dayIndexToISO(r.start), end: dayIndexToISO(r.end) };
}
