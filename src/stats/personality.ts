import type { PersonalityStats, PersonalityTrait, WrappedStats } from './types';

/**
 * Rule-based "personality". Deterministic, explainable, no AI: every label comes with the stat
 * that earned it, so people can argue about it in the group chat (that's the point).
 */
export function computePersonality(s: WrappedStats): PersonalityStats | null {
  const t = s.totals;
  const time = s.time;
  const ig = s.instagram;
  if (!t && !ig) return null;

  // ---- Adjective: when you text ----
  let adjective = 'Always-On';
  let emoji = '⚡';
  let palette: PersonalityStats['palette'] = 'day';
  if (time) {
    const h = time.peakHour;
    if (time.lateNightPct >= 0.12 || h >= 23 || h <= 3) {
      adjective = 'Night Owl';
      emoji = '🦉';
      palette = 'night';
    } else if (h >= 4 && h <= 9) {
      adjective = 'Early Bird';
      emoji = '🌅';
      palette = 'dawn';
    } else if (h >= 10 && h <= 16) {
      adjective = 'Daylight';
      emoji = '☀️';
      palette = 'day';
    } else {
      adjective = 'Golden Hour';
      emoji = '🌇';
      palette = 'dusk';
    }
  } else if (ig) {
    adjective = 'Scroll-Happy';
    emoji = '📲';
  }

  // ---- Noun: how you text ----
  const perDay = t?.perActiveDay ?? 0;
  const words = s.words;
  const reply = s.replies?.myMedianMs ?? null;
  const mediaShare = t && t.sent ? t.mediaSent / t.sent : 0;
  let noun = 'Texter';
  if (!t || t.sent === 0) noun = ig && ig.likes > ig.dmsSent ? 'Double-Tapper' : 'Lurker';
  else if (perDay >= 150) noun = 'Yapper';
  else if (words && words.avgWordsPerMessage >= 14) noun = 'Paragraph Texter';
  else if (mediaShare >= 0.25) noun = 'Meme Dealer';
  else if (words && words.emojiPerMessage >= 0.6) noun = 'Emoji Artist';
  else if (reply !== null && reply < 60_000) noun = 'Speed Texter';
  else if (perDay >= 50) noun = 'Chatterbox';
  else if (perDay < 8) noun = 'Minimalist';

  // ---- Traits ----
  const traits: PersonalityTrait[] = [];
  const add = (e: string, label: string, reason: string) => traits.push({ emoji: e, label, reason });
  const p = s.people;
  if (p && !p.fromGroups && p.top[0] && p.topShare >= 0.35) {
    add('🫶', 'Ride or Die', `${Math.round(p.topShare * 100)}% of your 1:1 chats were with ${p.top[0].name}`);
  }
  if (time && time.threeAm >= 25) add('🌙', '3am Philosopher', `${time.threeAm.toLocaleString()} messages sent between 3 and 4am`);
  if (reply !== null && reply < 120_000) add('⚡', 'Lightning Replier', `You reply in ${fmtShort(reply)} on average`);
  if (reply !== null && reply > 3_600_000) add('👻', 'Leaves on Seen', `Your median reply takes ${fmtShort(reply)}`);
  if (words && words.emojiPerMessage >= 0.5) add('🎨', 'Emoji Maximalist', `${words.totalEmojis.toLocaleString()} emojis sent`);
  if (s.streak && s.streak.days >= 30) add('🔥', 'Streak Keeper', `${s.streak.days} days straight with ${s.streak.name}`);
  if (t && t.received > 0 && t.sent / t.received >= 1.4) add('🎤', 'Main Character', 'You send way more than you receive');
  if (t && t.received > 0 && t.sent / t.received <= 0.6) add('👀', 'Quiet Observer', 'You read more than you write');
  if (p && p.topGroup && t && p.topGroup.total >= t.exchanged * 0.4) add('👑', 'Group Chat Royalty', `${p.topGroup.title} was your main stage`);
  if (p && p.uniquePeople >= 25) add('🦋', 'Social Butterfly', `You talked to ${p.uniquePeople} people`);
  if (t && t.laughsSent >= 500) add('😂', 'Easily Amused', `You laughed in text ${t.laughsSent.toLocaleString()} times`);
  if (t && t.deletedSent >= 20) add('🫣', 'Second Thoughts', `${t.deletedSent} messages deleted`);
  if (ig && ig.likes >= 1000) add('❤️', 'Double-Tap Addict', `${ig.likes.toLocaleString()} posts liked`);
  if (ig && ig.stories >= 100) add('👁️', 'Story Stalker', `${ig.stories.toLocaleString()} story interactions`);
  if (traits.length < 3 && t && t.sent > 0) add('💬', 'Consistent', `Active on ${t.activeDays} days`);
  if (traits.length < 3 && time) add('⏰', `Peak at ${fmtHour(time.peakHour)}`, 'Your busiest hour');

  const title = `${adjective} ${noun}`;
  const tagline = buildTagline(s, adjective);
  return { title, emoji, adjective, noun, tagline, traits: traits.slice(0, 4), palette };
}

function buildTagline(s: WrappedStats, adjective: string): string {
  const t = s.totals;
  const top = s.people?.top[0];
  if (!t) return 'Your scroll says more than your texts.';
  const when =
    adjective === 'Night Owl'
      ? 'mostly when everyone else was asleep'
      : adjective === 'Early Bird'
        ? 'mostly before everyone else woke up'
        : adjective === 'Golden Hour'
          ? 'mostly in the evenings'
          : 'mostly during the day';
  const who = top && !s.people?.fromGroups ? `, and ${top.name} got the most of them` : '';
  return `${t.sent.toLocaleString()} messages, ${when}${who}.`;
}

export function fmtHour(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${suffix}`;
}

export function fmtShort(ms: number): string {
  if (ms < 60_000) return 'under a minute';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.round((ms / 3_600_000) * 10) / 10;
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}
