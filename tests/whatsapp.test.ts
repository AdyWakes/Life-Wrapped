import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { looksLikeWhatsApp, parseWhatsApp } from '../src/parsers/whatsapp/parseWhatsApp';
import { detectDateOrder } from '../src/parsers/whatsapp/dateFormat';
import { titleFromFileName } from '../src/parsers/whatsapp/patterns';

const fx = (name: string) => readFileSync(new URL(`./fixtures/whatsapp/${name}`, import.meta.url), 'utf8');
const parse = (name: string, localeHint?: string) => parseWhatsApp(fx(name), { fileName: name, localeHint }).chat;
const local = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, m - 1, d, h, mi, s).getTime();

describe('WhatsApp: Android dd/mm/yy 24h group', () => {
  const chat = parse('android-dmy-24h-group.txt');
  const real = chat.messages.filter((m) => m.kind !== 'system');

  it('detects group and participants (system lines are not participants)', () => {
    expect(chat.isGroup).toBe(true);
    expect(chat.participants.sort()).toEqual(['+91 98765 43210', 'Aarav Sharma', 'Priya', 'Rohan Mehta'].sort());
  });

  it('parses dd/mm dates and 24h times', () => {
    const neend = real.find((m) => m.text.startsWith('neend'))!;
    expect(neend.ts).toBe(local(2026, 1, 14, 3, 12));
    expect(neend.sender).toBe('Aarav Sharma');
  });

  it('joins multi-line messages', () => {
    const m = real.find((x) => x.text.startsWith('haan bhai'))!;
    expect(m.text).toBe('haan bhai pakka\nkitne baje?\naur kahan?');
  });

  it('classifies media, deleted and system messages', () => {
    expect(real.filter((m) => m.kind === 'media')).toHaveLength(1);
    expect(real.filter((m) => m.kind === 'deleted')).toHaveLength(2);
    const sys = chat.messages.filter((m) => m.kind === 'system');
    // encryption, created, added, subject change, joined, left
    expect(sys).toHaveLength(6);
  });

  it('does not treat a subject change containing ": " as a message', () => {
    expect(chat.participants.some((p) => p.includes('changed'))).toBe(false);
  });

  it('keeps colons inside message text', () => {
    expect(real.at(-1)!.text).toBe('Note: time is 10:30 sharp');
  });

  it('records "You deleted this message" sender as a me-hint', () => {
    expect(chat.meHints).toEqual(['Aarav Sharma']);
  });

  it('keeps Hinglish and emoji text intact', () => {
    expect(real.some((m) => m.text === 'Happy new year 🥳 kal milte hai na?')).toBe(true);
  });
});

describe('WhatsApp: Android mm/dd/yy 12h (U+202F) 1:1', () => {
  const chat = parse('WhatsApp Chat with Maya Chen.txt');
  const real = chat.messages.filter((m) => m.kind !== 'system');

  it('takes the title from the filename and marks it as not-me', () => {
    expect(chat.title).toBe('Maya Chen');
    expect(chat.isGroup).toBe(false);
    expect(chat.notMeHints).toEqual(['Maya Chen']);
  });

  it('handles 12 AM / 12 PM correctly', () => {
    expect(real.find((m) => m.text.startsWith('HAPPY'))!.ts).toBe(local(2026, 1, 1, 0, 0));
    expect(real.find((m) => m.text === 'lunch?')!.ts).toBe(local(2026, 1, 13, 12, 30));
    expect(real.find((m) => m.text === 'almost midnight!!')!.ts).toBe(local(2025, 12, 31, 23, 59));
  });

  it('strips the <This message was edited> suffix', () => {
    expect(real.find((m) => m.text.startsWith('omw'))!.text).toBe('omw');
  });

  it('treats "(file attached)" as media', () => {
    expect(real.filter((m) => m.kind === 'media')).toHaveLength(2);
  });
});

describe('WhatsApp: iOS bracketed dd/mm/yyyy 24h with LRM marks', () => {
  const chat = parse('ios-dmy-24h-1to1.txt');
  const real = chat.messages.filter((m) => m.kind !== 'system');

  it('parses bracketed headers with seconds', () => {
    expect(real[0]!.ts).toBe(local(2026, 1, 2, 10, 0, 5));
    expect(chat.isGroup).toBe(false);
    expect(chat.participants.sort()).toEqual(['Aarav Sharma', 'Kabir Singh']);
  });

  it('attributes the encryption notice to the other person -> not-me hint, not a message', () => {
    expect(chat.messages[0]!.kind).toBe('system');
    expect(chat.notMeHints).toContain('Kabir Singh');
  });

  it('classifies iOS media / call / deleted placeholders', () => {
    expect(real.filter((m) => m.kind === 'media')).toHaveLength(3);
    expect(real.filter((m) => m.kind === 'call')).toHaveLength(1);
    expect(real.filter((m) => m.kind === 'deleted')).toHaveLength(1);
  });

  it('joins multi-line iOS messages', () => {
    expect(real.find((m) => m.text.startsWith('sorry'))!.text).toBe('sorry was driving\ncall you in 5');
  });
});

describe('WhatsApp: iOS m/d/yy 12h group', () => {
  const chat = parse('ios-mdy-12h-group.txt');

  it('detects MDY from a day > 12', () => {
    const m = chat.messages.find((x) => x.text.startsWith('finished'))!;
    expect(m.ts).toBe(local(2026, 3, 15, 23, 45, 10));
  });

  it('uses the group name from system-line attribution, and strips "~ " from unsaved contacts', () => {
    expect(chat.isGroup).toBe(true);
    expect(chat.participants).toContain('Lena Fischer');
    expect(chat.participants).not.toContain('Book Club');
    expect(chat.title).toBe('ios-mdy-12h-group');
  });

  it('LRM-prefixed lines are system messages', () => {
    expect(chat.messages.filter((m) => m.kind === 'system')).toHaveLength(4);
    expect(chat.messages.filter((m) => m.kind === 'media')).toHaveLength(1);
  });

  it('falls back to the group name when the filename is generic', () => {
    const c = parseWhatsApp(fx('ios-mdy-12h-group.txt'), { fileName: '_chat.txt' }).chat;
    expect(c.title).toBe('Book Club');
  });
});

describe('WhatsApp: date order detection', () => {
  it('uses chronology when all days are ≤ 12', () => {
    const r = parseWhatsApp(fx('ambiguous-dmy.txt'), { localeHint: 'en-US' });
    expect(r.dateOrder).toBe('DMY');
    expect(r.chat.messages[0]!.ts).toBe(local(2026, 1, 5, 10, 0));
  });

  it('falls back to the locale hint for a single ambiguous date', () => {
    const one = [{ a: 3, b: 4, c: 26, aLen: 2 }];
    expect(detectDateOrder(one, 'en-US')).toBe('MDY');
    expect(detectDateOrder(one, 'en-IN')).toBe('DMY');
  });

  it('handles dotted German dates and localized media placeholders', () => {
    const chat = parse('android-dots-de.txt');
    expect(chat.messages[0]!.ts).toBe(local(2025, 12, 31, 23, 59));
    expect(chat.messages[2]!.kind).toBe('media');
  });

  it('handles year-first dates', () => {
    const chat = parse('ymd.txt');
    expect(chat.messages[1]!.ts).toBe(local(2026, 4, 2, 18, 30));
  });

  it('handles Devanagari names/text, missing comma and "a.m./p.m."', () => {
    const chat = parse('hindi-ampm-dots.txt');
    expect(chat.participants).toContain('दादी');
    expect(chat.messages[0]!.text).toBe('बेटा खाना खाया? 🍛');
    expect(chat.messages[2]!.ts).toBe(local(2026, 3, 10, 22, 5));
    expect(chat.messages[3]!.ts).toBe(local(2026, 3, 11, 0, 10));
  });
});

describe('WhatsApp: helpers & robustness', () => {
  it('extracts titles from export filenames in several languages', () => {
    expect(titleFromFileName('WhatsApp Chat with Priya.txt')).toBe('Priya');
    expect(titleFromFileName('WhatsApp Chat - Goa Trip 🌴.zip')).toBe('Goa Trip 🌴');
    expect(titleFromFileName('WhatsApp Chat with Priya (2).txt')).toBe('Priya');
    expect(titleFromFileName('Chat de WhatsApp con Lucía.txt')).toBe('Lucía');
    expect(titleFromFileName('_chat.txt')).toBeNull();
  });

  it('recognises WhatsApp text and rejects other text', () => {
    expect(looksLikeWhatsApp(fx('android-dmy-24h-group.txt'))).toBe(true);
    expect(looksLikeWhatsApp(fx('ios-dmy-24h-1to1.txt'))).toBe(true);
    expect(looksLikeWhatsApp('hello\nthis is my shopping list\nmilk')).toBe(false);
  });

  it('never throws on garbage or empty input', () => {
    expect(parseWhatsApp('').chat.messages).toHaveLength(0);
    expect(parseWhatsApp('\u0000\u0001 random ::: text\n[[[').chat.messages).toHaveLength(0);
  });

  it('handles CRLF line endings and BOM', () => {
    const text = '﻿' + fx('android-dots-de.txt').replace(/\n/g, '\r\n');
    const chat = parseWhatsApp(text).chat;
    expect(chat.messages).toHaveLength(3);
    expect(chat.messages[0]!.text).toBe('Guten Rutsch!');
  });

  it('ignores pasted timestamps in a different style inside messages', () => {
    const lines = ['[01/02/2026, 10:00:00] Ana: look at this old message:'];
    for (let i = 0; i < 30; i++) lines.push(`[01/02/2026, 10:${String(i + 1).padStart(2, '0')}:00] Ben: msg ${i}`);
    lines.splice(1, 0, '01/01/2026, 09:00 - Ben: pasted');
    const chat = parseWhatsApp(lines.join('\n')).chat;
    expect(chat.messages[0]!.text).toBe('look at this old message:\n01/01/2026, 09:00 - Ben: pasted');
  });

  it('parses 200k messages quickly', () => {
    const names = ['Aarav', 'Priya', 'Rohan'];
    const lines: string[] = [];
    const start = new Date(2026, 0, 1).getTime();
    for (let i = 0; i < 200_000; i++) {
      const d = new Date(start + i * 60_000);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      lines.push(`${dd}/${mm}/26, ${hh}:${mi} - ${names[i % 3]}: message number ${i} kya haal hai 😂`);
    }
    const t0 = performance.now();
    const chat = parseWhatsApp(lines.join('\n')).chat;
    const ms = performance.now() - t0;
    expect(chat.messages).toHaveLength(200_000);
    expect(chat.isGroup).toBe(true);
    expect(ms).toBeLessThan(5000);
  });
});
