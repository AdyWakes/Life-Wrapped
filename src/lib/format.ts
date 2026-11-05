export function durationParts(ms: number): { value: string; unit: string } {
  if (ms < 60_000) {
    const s = Math.max(1, Math.round(ms / 1000));
    return { value: String(s), unit: s === 1 ? 'second' : 'seconds' };
  }
  const min = ms / 60_000;
  if (min < 60) {
    const v = Math.round(min);
    return { value: String(v), unit: v === 1 ? 'minute' : 'minutes' };
  }
  const h = Math.round((ms / 3_600_000) * 10) / 10;
  return { value: String(h), unit: h === 1 ? 'hour' : 'hours' };
}

export function durationShort(ms: number): string {
  const { value, unit } = durationParts(ms);
  const u = unit.startsWith('second') ? 's' : unit.startsWith('minute') ? ' min' : unit === 'hour' ? ' hr' : ' hrs';
  return `${value}${u}`;
}

export function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${suffix}`;
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function isoToNice(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}
