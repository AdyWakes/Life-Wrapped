import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeStats } from '../src/stats/compute';
import { summarize } from '../src/stats/summary';
import { extractEmojis, extractWords } from '../src/stats/text';
import { longestRun } from '../src/stats/streaks';
import { localDayIndex } from '../src/stats/dates';
import { parseWhatsApp } from '../src/parsers/whatsapp/parseWhatsApp';
import type { Chat, Dataset, Message } from '../src/types';

const at = (m: number, d: number, h = 12, mi = 0, y = 2026) => new Date(y, m - 1, d, h, mi).getTime();
const msg = (ts: number, sender: string, text = 'hello there'): Message => ({ ts, sender, kind: 'text', text });

function chat(title: string, messages: Message[], isGroup = false): Chat {
  return {
    id: title,
    platform: 'whatsapp',
    title,
    isGroup,
    participants: [...new Set(messages.map((m) => m.sender))],
    messages,
    sourceFile: `${title}.txt`,
    notMeHints: [],
    meHints: [],
  };
}

describe('text helpers', () => {
  it('counts emoji incl. ZWJ sequences, skin tones and flags', () => {
    const m = new Map<string, number>();
    const n = extractEmojis('lol 😂😂 👍🏽 👨‍👩‍👧 🇮🇳 ❤️ ©', m);
    expect(n).toBe(6);
    expect(m.get('😂')).toBe(2);
    expect(m.get('👍🏽')).toBe(1);
    expect(m.get('👨‍👩‍👧')).toBe(1);
    expect(m.get('🇮🇳')).toBe(1);
    expect(m.get('❤')).toBe(1);
  });

  it('removes English, Hinglish and Hindi stopwords, keeps Devanagari words whole', () => {
    const m = new Map<string, number>();
    const counters = { laughs: 0 };
    const total = extractWords('Kya kar raha hai bhai? Chai peete hai. hahaha LOL चाय पीते हैं दोस्त https://x.com/a', m, counters);
    expect(total).toBe(14);
    expect([...m.keys()].sort()).toEqual(['chai', 'peete', 'चाय', 'दोस्त', 'पीते'].sort());
    expect(counters.laughs).toBe(2);
  });

  it('collapses stretched words', () => {
    const m = new Map<string, number>();
    extractWords('sooooo goooood', m);
    expect([...m.keys()]).toEqual(['soo', 'good']);
  });
});

describe('streaks', () => {
  it('finds the longest consecutive run', () => {
    expect(longestRun([1, 2, 3, 7, 8, 9, 10, 20])).toEqual({ days: 4, start: 7, end: 10 });
    expect(longestRun([])).toBeNull();
  });
});

describe('computeStats', () => {
  const me = 'Aarav';
  const priya: Message[] = [];
  // Priya: daily chat Jan 1..10 (both sides), she replies in 1 min, you in 10 min.
  for (let d = 1; d <= 10; d++) {
    priya.push(msg(at(1, d, 22, 0), 'Priya', 'kya kar rahe ho 😂'));
    priya.push(msg(at(1, d, 22, 10), me, 'bas chilling yaar 😂🔥'));
    priya.push(msg(at(1, d, 22, 11), 'Priya', 'same'));
  }
  // Rohan: 3 late-night messages, slow replies (2h)
  const rohan: Message[] = [];
  for (let d = 1; d <= 6; d++) {
    rohan.push(msg(at(2, d, 3, 0), me, 'awake?'));
    rohan.push(msg(at(2, d, 5, 0), 'Rohan', 'now I am'));
  }
  // Last year's messages should be filtered out
  const old = [msg(at(6, 1, 12, 0, 2025), me, 'old'), msg(at(6, 1, 12, 5, 2025), 'Priya', 'old')];
  const group = chat('Goa Trip', [msg(at(3, 1), me, 'goa!!'), msg(at(3, 1), 'Priya'), msg(at(3, 1), 'Kabir'), msg(at(3, 2), 'Kabir')], true);
  const ds: Dataset = {
    chats: [chat('Priya', [...old, ...priya]), chat('Rohan', rohan), group],
    instagram: null,
    warnings: [],
  };
  const s = computeStats(ds, { me: [me], year: 2026 });

  it('counts sent / received for the selected year only', () => {
    expect(s.totals!.sent).toBe(10 + 6 + 1);
    expect(s.totals!.received).toBe(20 + 6 + 3);
    expect(s.totals!.prevYearSent).toBe(1);
  });

  it('ranks people from 1:1 chats', () => {
    expect(s.people!.top.map((p) => p.name)).toEqual(['Priya', 'Rohan']);
    expect(s.people!.top[0]!.total).toBe(30);
    expect(s.people!.topGroup!.title).toBe('Goa Trip');
  });

  it('builds the heatmap from your own messages', () => {
    expect(s.time!.basis).toBe('sent');
    expect(s.time!.peakHour).toBe(22);
    expect(s.time!.threeAm).toBe(6);
    expect(s.time!.lateNightPerson!.name).toBe('Rohan');
  });

  it('finds top emojis and words', () => {
    expect(s.words!.topEmojis[0]).toEqual({ emoji: '😂', count: 10 });
    expect(s.words!.topWords.map((w) => w.word)).toContain('chilling');
  });

  it('finds the longest streak (both sides texting)', () => {
    expect(s.streak!.name).toBe('Priya');
    expect(s.streak!.days).toBe(10);
    expect(s.streak!.start).toBe('2026-01-01');
  });

  it('computes median reply times both ways', () => {
    expect(s.replies!.fastest!.name).toBe('Priya');
    expect(s.replies!.fastest!.theirMedianMs).toBe(60_000);
    expect(s.replies!.slowest!.name).toBe('Rohan');
    expect(s.replies!.slowest!.theirMedianMs).toBe(2 * 3_600_000);
  });

  it('produces a personality', () => {
    expect(s.personality!.title).toMatch(/\w+ \w+/);
    expect(s.personality!.traits.length).toBeGreaterThanOrEqual(2);
  });

  it('handles all-time and empty years without crashing', () => {
    const all = computeStats(ds, { me: [me], year: 'all' });
    expect(all.totals!.sent).toBe(18);
    const empty = computeStats(ds, { me: [me], year: 1999 });
    expect(empty.totals).toBeNull();
    expect(empty.personality).toBeNull();
    const none = computeStats({ chats: [], instagram: null, warnings: [] }, { me: [], year: 2026 });
    expect(none.totals).toBeNull();
  });

  it('local day index splits at local midnight', () => {
    expect(localDayIndex(at(1, 1, 23, 59)) + 1).toBe(localDayIndex(at(1, 2, 0, 1)));
  });
});

describe('summarize', () => {
  const fx = (name: string) => readFileSync(new URL(`./fixtures/whatsapp/${name}`, import.meta.url), 'utf8');
  it('suggests "me" from hints across chats', () => {
    const chats = [
      parseWhatsApp(fx('android-dmy-24h-group.txt'), { fileName: 'group.txt' }).chat,
      parseWhatsApp(fx('ios-dmy-24h-1to1.txt'), { fileName: '_chat.txt' }).chat,
    ];
    const s = summarize({ chats, instagram: null, warnings: [] }, new Date(2026, 10, 1));
    expect(s.suggestedMe).toEqual(['Aarav Sharma']);
    expect(s.defaultYear).toBe(2026);
    expect(s.participants[0]!.name).toBe('Aarav Sharma');
  });

  it('suggests the non-title person in a single 1:1 chat', () => {
    const c = parseWhatsApp(fx('WhatsApp Chat with Maya Chen.txt'), { fileName: 'WhatsApp Chat with Maya Chen.txt' }).chat;
    const s = summarize({ chats: [c], instagram: null, warnings: [] }, new Date(2030, 0, 1));
    expect(s.suggestedMe).toEqual(['Alex Rivera']);
    expect(s.defaultYear).toBe(2026); // current year has no data -> most recent year
  });
});
