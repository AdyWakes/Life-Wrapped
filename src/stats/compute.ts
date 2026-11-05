import type { Chat, Dataset, Message, Platform, StatsOptions } from '../types';
import { localDayIndex, dayIndexToISO, median, normName, yearOf } from './dates';
import { computeInstagram } from './instagram';
import { computePersonality } from './personality';
import { replyTimes } from './replies';
import { longestRun, runToISO } from './streaks';
import { extractEmojis, extractWords, topN } from './text';
import type {
  Comparison,
  PeopleStats,
  PersonStat,
  ReplyPerson,
  ReplyStats,
  StreakStats,
  TimeStats,
  TotalsStats,
  WordStats,
  WrappedStats,
} from './types';

const WORDS_PER_NOVEL = 90_000;
const WORDS_PER_SHORT_STORY = 7_500;
const TYPING_WPM = 40;

function counts(m: Message): boolean {
  return m.kind !== 'system' && m.kind !== 'call';
}

interface PersonAgg {
  name: string;
  platforms: Set<Platform>;
  sent: number;
  received: number;
  days: Map<number, number>; // day -> bitmask (1 = me, 2 = them)
  lateNight: number;
  chats: Chat[];
}

export function computeStats(ds: Dataset, opts: StatsOptions): WrappedStats {
  const meSet = new Set(opts.me.map(normName));
  const isMe = (s: string) => meSet.has(normName(s));
  const inYear = opts.year === 'all' ? () => true : (ts: number) => yearOf(ts) === opts.year;

  // Pre-filter each chat to the selected year.
  const chats = ds.chats
    .map((c) => ({ chat: c, msgs: c.messages.filter((m) => counts(m) && inYear(m.ts)) }))
    .filter((c) => c.msgs.length > 0);

  let sent = 0;
  let received = 0;
  let wordsSent = 0;
  let mediaSent = 0;
  let deletedSent = 0;
  let textSent = 0;
  let emojiTotal = 0;
  const laughCounter = { laughs: 0 };
  const byPlatform: TotalsStats['byPlatform'] = {};
  const dayCounts = new Map<number, number>();
  const myDays = new Set<number>();
  const heatSent = emptyHeatmap();
  const heatAll = emptyHeatmap();
  const emojiMap = new Map<string, number>();
  const wordMap = new Map<string, number>();
  const people = new Map<string, PersonAgg>();
  const groupMembers = new Map<string, { name: string; platforms: Set<Platform>; count: number }>();
  let topGroup: PeopleStats['topGroup'] = null;
  let first = Infinity;
  let last = -Infinity;

  // Names of "me" shouldn't show up in the word list (people often type their own name).
  const extraStop = new Set<string>();
  for (const n of meSet) for (const part of n.split(' ')) if (part.length > 1) extraStop.add(part);

  for (const { chat, msgs } of chats) {
    const plat = (byPlatform[chat.platform] ??= { sent: 0, received: 0 });
    const other = chat.isGroup ? null : otherPerson(chat, isMe);
    let agg: PersonAgg | undefined;
    if (other) {
      const key = normName(other);
      agg = people.get(key);
      if (!agg) {
        agg = { name: other, platforms: new Set(), sent: 0, received: 0, days: new Map(), lateNight: 0, chats: [] };
        people.set(key, agg);
      }
      agg.platforms.add(chat.platform);
      agg.chats.push(chat);
    }
    let groupMine = 0;

    for (const m of msgs) {
      if (m.ts < first) first = m.ts;
      if (m.ts > last) last = m.ts;
      const d = new Date(m.ts);
      const hour = d.getHours();
      const dow = (d.getDay() + 6) % 7;
      const day = localDayIndex(m.ts);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      heatAll[dow]![hour]!++;
      const mine = isMe(m.sender);

      if (mine) {
        sent++;
        plat.sent++;
        groupMine++;
        myDays.add(day);
        heatSent[dow]![hour]!++;
        if (m.kind === 'media') mediaSent++;
        else if (m.kind === 'deleted') deletedSent++;
        else if (m.text) {
          textSent++;
          wordsSent += extractWords(m.text, wordMap, laughCounter, extraStop);
          emojiTotal += extractEmojis(m.text, emojiMap);
        }
      } else {
        received++;
        plat.received++;
        if (chat.isGroup) {
          const key = normName(m.sender);
          const gm = groupMembers.get(key) ?? { name: m.sender, platforms: new Set<Platform>(), count: 0 };
          gm.count++;
          gm.platforms.add(chat.platform);
          groupMembers.set(key, gm);
        }
      }

      if (agg) {
        if (mine) agg.sent++;
        else agg.received++;
        agg.days.set(day, (agg.days.get(day) ?? 0) | (mine ? 1 : 2));
        if (hour < 5) agg.lateNight++;
      }
    }
    if (chat.isGroup && (!topGroup || msgs.length > topGroup.total)) {
      topGroup = { title: chat.title, sent: groupMine, total: msgs.length };
    }
  }

  const exchanged = sent + received;
  if (exchanged === 0) {
    const instagram = computeInstagram(ds, opts, isMe, inYear);
    const stats = emptyStats(opts);
    stats.instagram = instagram;
    stats.personality = computePersonality(stats);
    return stats;
  }

  // ---------------- Totals ----------------
  let busiestDay: TotalsStats['busiestDay'] = null;
  for (const [day, count] of dayCounts) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { date: dayIndexToISO(day), count };
  }
  let prevYearSent: number | null = null;
  if (opts.year !== 'all') {
    const py = opts.year - 1;
    let n = 0;
    for (const c of ds.chats) for (const m of c.messages) if (counts(m) && isMe(m.sender) && yearOf(m.ts) === py) n++;
    prevYearSent = n > 0 ? n : null;
  }
  const totals: TotalsStats = {
    sent,
    received,
    exchanged,
    wordsSent,
    mediaSent,
    deletedSent,
    laughsSent: laughCounter.laughs,
    activeDays: myDays.size,
    perActiveDay: myDays.size ? sent / myDays.size : 0,
    chats: chats.length,
    byPlatform,
    comparison: comparison(wordsSent),
    typingHours: wordsSent / TYPING_WPM / 60,
    prevYearSent,
    changePct: prevYearSent ? Math.round(((sent - prevYearSent) / prevYearSent) * 100) : null,
    busiestDay,
  };

  // ---------------- People ----------------
  const personList: PersonStat[] = [...people.values()]
    .map((p) => ({ name: p.name, platforms: [...p.platforms], sent: p.sent, received: p.received, total: p.sent + p.received }))
    .sort((a, b) => b.total - a.total);
  let peopleStats: PeopleStats | null = null;
  if (personList.length) {
    const oneToOneTotal = personList.reduce((n, p) => n + p.total, 0);
    peopleStats = {
      top: personList.slice(0, 5),
      fromGroups: false,
      uniquePeople: new Set([...people.keys(), ...groupMembers.keys()]).size,
      topGroup,
      topShare: oneToOneTotal ? personList[0]!.total / oneToOneTotal : 0,
    };
  } else if (groupMembers.size) {
    const list = [...groupMembers.values()].sort((a, b) => b.count - a.count);
    const tot = list.reduce((n, p) => n + p.count, 0);
    peopleStats = {
      top: list.slice(0, 5).map((g) => ({ name: g.name, platforms: [...g.platforms], sent: 0, received: g.count, total: g.count })),
      fromGroups: true,
      uniquePeople: groupMembers.size,
      topGroup,
      topShare: tot ? list[0]!.count / tot : 0,
    };
  }

  // ---------------- Time ----------------
  const basis: TimeStats['basis'] = sent > 0 ? 'sent' : 'all';
  const heat = basis === 'sent' ? heatSent : heatAll;
  const hours = Array.from({ length: 24 }, (_, h) => heat.reduce((n, row) => n + row[h]!, 0));
  const daysTotals = heat.map((row) => row.reduce((a, b) => a + b, 0));
  const lateNight = hours.slice(0, 5).reduce((a, b) => a + b, 0);
  const basisTotal = hours.reduce((a, b) => a + b, 0) || 1;
  const lnp = [...people.values()].sort((a, b) => b.lateNight - a.lateNight)[0];
  const time: TimeStats = {
    heatmap: heat,
    hours,
    peakHour: argmax(hours),
    peakDay: argmax(daysTotals),
    lateNight,
    threeAm: hours[3]!,
    lateNightPct: lateNight / basisTotal,
    lateNightPerson: lnp && lnp.lateNight > 0 ? { name: lnp.name, count: lnp.lateNight } : null,
    basis,
  };

  // ---------------- Words ----------------
  const words: WordStats | null =
    textSent > 0
      ? {
          topEmojis: topN(emojiMap, 10).map(({ key, count }) => ({ emoji: key, count })),
          topWords: topN(wordMap, 12).map(({ key, count }) => ({ word: key, count })),
          totalEmojis: emojiTotal,
          uniqueEmojis: emojiMap.size,
          emojiPerMessage: emojiTotal / textSent,
          avgWordsPerMessage: wordsSent / textSent,
        }
      : null;

  // ---------------- Streak ----------------
  let streak: StreakStats | null = null;
  const runs = [...people.values()]
    .map((p) => {
      const bothDays = [...p.days.entries()].filter(([, mask]) => mask === 3).map(([d]) => d);
      return { p, run: longestRun(bothDays) };
    })
    .filter((r) => r.run && r.run.days >= 2)
    .sort((a, b) => b.run!.days - a.run!.days || b.p.sent + b.p.received - (a.p.sent + a.p.received));
  if (runs.length) {
    const best = runs[0]!;
    streak = {
      name: best.p.name,
      platforms: [...best.p.platforms],
      days: best.run!.days,
      ...runToISO(best.run!),
      runnersUp: runs.slice(1, 4).map((r) => ({ name: r.p.name, days: r.run!.days })),
    };
  }

  // ---------------- Replies ----------------
  const replyPeople: ReplyPerson[] = [];
  const allMine: number[] = [];
  for (const p of people.values()) {
    const mineGaps: number[] = [];
    const theirGaps: number[] = [];
    for (const chat of p.chats) {
      const msgs = chat.messages.filter((m) => counts(m) && inYear(m.ts));
      const r = replyTimes(msgs, isMe);
      mineGaps.push(...r.mine);
      theirGaps.push(...r.theirs);
    }
    allMine.push(...mineGaps);
    replyPeople.push({
      name: p.name,
      theirMedianMs: theirGaps.length >= 5 ? median(theirGaps) : null,
      myMedianMs: mineGaps.length >= 5 ? median(mineGaps) : null,
      samples: Math.min(mineGaps.length, theirGaps.length),
    });
  }
  const rank = new Map(personList.map((p, i) => [normName(p.name), i]));
  // Only judge people you actually talk to (top 15 by volume) so one-off contacts don't win.
  const judged = replyPeople.filter((r) => (rank.get(normName(r.name)) ?? 99) < 15);
  const withTheirs = judged.filter((r) => r.theirMedianMs !== null).sort((a, b) => a.theirMedianMs! - b.theirMedianMs!);
  const withMine = judged.filter((r) => r.myMedianMs !== null).sort((a, b) => b.myMedianMs! - a.myMedianMs!);
  const myMedianMs = allMine.length >= 5 ? median(allMine) : null;
  const replies: ReplyStats | null =
    withTheirs.length || myMedianMs !== null
      ? {
          myMedianMs,
          fastest: withTheirs[0] ?? null,
          slowest: withTheirs.length > 1 ? withTheirs[withTheirs.length - 1]! : null,
          youLeaveOnSeen: withMine.length > 1 ? withMine[0]! : null,
          people: withTheirs.slice(0, 10),
        }
      : null;

  const stats: WrappedStats = {
    year: opts.year,
    yearLabel: opts.year === 'all' ? 'All time' : String(opts.year),
    me: opts.me,
    range: { first, last },
    totals,
    people: peopleStats,
    time,
    words,
    streak,
    replies,
    instagram: computeInstagram(ds, opts, isMe, inYear),
    personality: null,
  };
  stats.personality = computePersonality(stats);
  return stats;
}

function otherPerson(chat: Chat, isMe: (s: string) => boolean): string | null {
  const others = chat.participants.filter((p) => !isMe(p));
  if (others.length === 1) return others[0]!;
  if (others.length === 0) {
    // Only you ever wrote (they never replied) — fall back to the chat title.
    return chat.title && !isMe(chat.title) ? chat.title : null;
  }
  // Two "others" in a 1:1 chat means "me" wasn't picked correctly; use the title if it matches.
  return others.find((o) => normName(o) === normName(chat.title)) ?? others[0]!;
}

function comparison(words: number): Comparison {
  const novels = words / WORDS_PER_NOVEL;
  if (novels >= 0.5) {
    const v = Math.round(novels * 10) / 10;
    return { value: v, unit: 'novels', blurb: `That's ${v} ${v === 1 ? 'novel' : 'novels'} worth of words` };
  }
  const stories = words / WORDS_PER_SHORT_STORY;
  if (stories >= 1) {
    const v = Math.round(stories * 10) / 10;
    return { value: v, unit: 'short stories', blurb: `That's ${v} short stories worth of words` };
  }
  if (words >= 1000) {
    const essays = Math.round((words / 1000) * 10) / 10;
    return { value: essays, unit: 'essays', blurb: `That's ${essays} school essays worth of words` };
  }
  return { value: words, unit: 'words', blurb: `${words.toLocaleString()} words. Short and sweet` };
}

function emptyHeatmap(): number[][] {
  return Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
}

function argmax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i]! > arr[best]!) best = i;
  return best;
}

function emptyStats(opts: StatsOptions): WrappedStats {
  return {
    year: opts.year,
    yearLabel: opts.year === 'all' ? 'All time' : String(opts.year),
    me: opts.me,
    range: null,
    totals: null,
    people: null,
    time: null,
    words: null,
    streak: null,
    replies: null,
    instagram: null,
    personality: null,
  };
}
