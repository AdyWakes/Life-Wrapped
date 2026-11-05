import type { WrappedStats } from '../stats/types';
import type { CardDef } from './types';
import { TotalCard } from './TotalCard';
import { TopPeopleCard } from './TopPeopleCard';
import { PeakHourCard } from './PeakHourCard';
import { EmojiWordsCard } from './EmojiWordsCard';
import { StreakCard } from './StreakCard';
import { ReplyCard } from './ReplyCard';
import { InstagramCard } from './InstagramCard';
import { PersonalityCard } from './PersonalityCard';

/** The story, in order. Each card only appears when its data exists. */
const ALL: (CardDef & { available: (s: WrappedStats) => boolean })[] = [
  { id: 'total', title: 'Messages', duration: 7, Component: TotalCard, available: (s) => !!s.totals && s.totals.sent > 0 },
  { id: 'people', title: '#1 person', duration: 7, Component: TopPeopleCard, available: (s) => !!s.people && s.people.top.length > 0 },
  { id: 'time', title: 'Peak hour', duration: 8, Component: PeakHourCard, available: (s) => !!s.time && s.time.hours.some((h) => h > 0) },
  {
    id: 'words',
    title: 'Emojis & words',
    duration: 7,
    Component: EmojiWordsCard,
    available: (s) => !!s.words && (s.words.topEmojis.length > 0 || s.words.topWords.length > 0),
  },
  { id: 'streak', title: 'Streak', duration: 7, Component: StreakCard, available: (s) => !!s.streak && s.streak.days >= 2 },
  {
    id: 'replies',
    title: 'Reply speed',
    duration: 7,
    Component: ReplyCard,
    available: (s) => !!s.replies && (s.replies.myMedianMs !== null || !!s.replies.fastest),
  },
  { id: 'instagram', title: 'Instagram', duration: 7, Component: InstagramCard, available: (s) => !!s.instagram },
  { id: 'personality', title: 'Personality', duration: 10, Component: PersonalityCard, available: (s) => !!s.personality },
];

export function buildCards(stats: WrappedStats): CardDef[] {
  return ALL.filter((c) => {
    try {
      return c.available(stats);
    } catch {
      return false;
    }
  }).map(({ available: _a, ...def }) => def);
}
