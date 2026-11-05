const DAY = 86_400_000;

/** Days since epoch in the *local* time zone (so 23:59 and 00:01 land on different days). */
export function localDayIndex(ts: number): number {
  const d = new Date(ts);
  return Math.floor((ts - d.getTimezoneOffset() * 60_000) / DAY);
}

export function dayIndexToISO(day: number): string {
  const d = new Date(day * DAY);
  return d.toISOString().slice(0, 10);
}

export function yearOf(ts: number): number {
  return new Date(ts).getFullYear();
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function normName(name: string): string {
  return name.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}
