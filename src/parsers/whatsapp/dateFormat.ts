export type DateOrder = 'DMY' | 'MDY' | 'YMD';

export interface DateTriple {
  a: number;
  b: number;
  c: number;
  aLen: number;
}

/**
 * Work out whether dates are dd/mm/yy, mm/dd/yy or yyyy-mm-dd from the data itself.
 * 1. A 4-digit first part means YMD.
 * 2. Any first part > 12 means DMY; any second part > 12 means MDY.
 * 3. Still ambiguous (every day so far is ≤ 12): pick the order under which the chat is most
 *    chronological (exports are always in time order), then fall back to the locale hint.
 */
export function detectDateOrder(samples: DateTriple[], localeHint?: string): DateOrder {
  if (samples.length === 0) return defaultOrder(localeHint);
  const ymd = samples.filter((s) => s.aLen === 4).length;
  if (ymd > samples.length / 2) return 'YMD';

  let aOver = 0;
  let bOver = 0;
  for (const s of samples) {
    if (s.a > 12) aOver++;
    if (s.b > 12) bOver++;
  }
  if (aOver > 0 && bOver === 0) return 'DMY';
  if (bOver > 0 && aOver === 0) return 'MDY';
  if (aOver > 0 && bOver > 0) return aOver >= bOver ? 'DMY' : 'MDY';

  const invDMY = inversions(samples, 'DMY');
  const invMDY = inversions(samples, 'MDY');
  if (invDMY < invMDY) return 'DMY';
  if (invMDY < invDMY) return 'MDY';
  return defaultOrder(localeHint);
}

function defaultOrder(localeHint?: string): DateOrder {
  // US-style month-first is used by en-US and a few others; most of the world (incl. India) is day-first.
  if (localeHint && /^(en-us|en-ph|en-ca|es-us|fil)/i.test(localeHint)) return 'MDY';
  return 'DMY';
}

function inversions(samples: DateTriple[], order: DateOrder): number {
  let prev = -Infinity;
  let count = 0;
  for (const s of samples) {
    const { y, m, d } = toYMD(s, order);
    const key = y * 400 + m * 32 + d;
    if (key < prev) count++;
    prev = key;
  }
  return count;
}

export function normalizeYear(y: number): number {
  if (y < 100) return 2000 + y;
  return y;
}

export function toYMD(s: DateTriple, order: DateOrder): { y: number; m: number; d: number } {
  switch (order) {
    case 'YMD':
      return { y: normalizeYear(s.a), m: s.b, d: s.c };
    case 'MDY':
      return { y: normalizeYear(s.c), m: s.a, d: s.b };
    default:
      return { y: normalizeYear(s.c), m: s.b, d: s.a };
  }
}

export function to24h(hour: number, ampm: string | undefined): number {
  if (!ampm) return hour;
  const pm = ampm.toLowerCase() === 'p';
  if (hour === 12) return pm ? 12 : 0;
  return pm ? hour + 12 : hour;
}
