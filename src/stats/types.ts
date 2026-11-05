import type { Platform } from '../types';

export interface PersonStat {
  name: string;
  platforms: Platform[];
  sent: number; // you -> them
  received: number; // them -> you
  total: number;
}

export interface Comparison {
  value: number;
  unit: string; // "novels"
  blurb: string; // "That's 3.2 novels' worth of words"
}

export interface TotalsStats {
  sent: number;
  received: number;
  exchanged: number;
  wordsSent: number;
  mediaSent: number;
  deletedSent: number;
  laughsSent: number;
  activeDays: number;
  perActiveDay: number;
  chats: number;
  byPlatform: Partial<Record<Platform, { sent: number; received: number }>>;
  comparison: Comparison;
  typingHours: number;
  prevYearSent: number | null;
  changePct: number | null;
  busiestDay: { date: string; count: number } | null;
}

export interface PeopleStats {
  top: PersonStat[];
  /** true when no 1:1 chats exist and the ranking comes from group messages. */
  fromGroups: boolean;
  uniquePeople: number;
  topGroup: { title: string; sent: number; total: number } | null;
  topShare: number; // share of all 1:1 messages that went to #1
}

export interface TimeStats {
  /** [day 0=Mon..6=Sun][hour 0..23] count of messages you sent. */
  heatmap: number[][];
  hours: number[];
  peakHour: number;
  peakDay: number;
  lateNight: number; // 00:00–04:59
  threeAm: number; // 03:00–03:59
  lateNightPct: number;
  lateNightPerson: { name: string; count: number } | null;
  basis: 'sent' | 'all';
}

export interface WordStats {
  topEmojis: { emoji: string; count: number }[];
  topWords: { word: string; count: number }[];
  totalEmojis: number;
  uniqueEmojis: number;
  emojiPerMessage: number;
  avgWordsPerMessage: number;
}

export interface StreakStats {
  name: string;
  platforms: Platform[];
  days: number;
  start: string; // yyyy-mm-dd
  end: string;
  runnersUp: { name: string; days: number }[];
}

export interface ReplyPerson {
  name: string;
  theirMedianMs: number | null; // how fast they reply to you
  myMedianMs: number | null; // how fast you reply to them
  samples: number;
}

export interface ReplyStats {
  myMedianMs: number | null;
  fastest: ReplyPerson | null;
  slowest: ReplyPerson | null; // leaves you on seen
  youLeaveOnSeen: ReplyPerson | null; // the person you take longest to answer
  people: ReplyPerson[];
}

export interface InstagramStats {
  dmsSent: number;
  dmsReceived: number;
  threads: number;
  likes: number;
  saved: number;
  stories: number;
  comments: number;
  topAccounts: { account: string; likes: number; stories: number; comments: number; saved: number; total: number }[];
  topDmPeople: { name: string; total: number }[];
  sources: string[];
}

export interface PersonalityTrait {
  emoji: string;
  label: string;
  reason: string;
}

export interface PersonalityStats {
  title: string; // "Night Owl Yapper"
  emoji: string;
  adjective: string;
  noun: string;
  tagline: string;
  traits: PersonalityTrait[];
  palette: 'night' | 'dawn' | 'day' | 'dusk';
}

export interface WrappedStats {
  year: number | 'all';
  yearLabel: string;
  me: string[];
  range: { first: number; last: number } | null;
  totals: TotalsStats | null;
  people: PeopleStats | null;
  time: TimeStats | null;
  words: WordStats | null;
  streak: StreakStats | null;
  replies: ReplyStats | null;
  instagram: InstagramStats | null;
  personality: PersonalityStats | null;
}
