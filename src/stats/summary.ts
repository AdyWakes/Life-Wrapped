import type { Dataset, DatasetSummary, ParticipantSummary, Platform } from '../types';
import { normName, yearOf } from './dates';

/** Everything the setup screen needs: who is in the data, who is probably "me", which years exist. */
export function summarize(ds: Dataset, now: Date = new Date()): DatasetSummary {
  const parts = new Map<string, ParticipantSummary & { key: string; notMe: number; meHint: number }>();
  const years = new Map<number, number>();
  let messageCount = 0;

  for (const chat of ds.chats) {
    const counts = new Map<string, number>();
    for (const m of chat.messages) {
      if (m.kind === 'system' || m.kind === 'call') continue;
      messageCount++;
      const y = yearOf(m.ts);
      years.set(y, (years.get(y) ?? 0) + 1);
      counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
    }
    for (const name of new Set([...chat.participants, ...counts.keys()])) {
      if (!name) continue;
      const key = normName(name);
      const p = parts.get(key) ?? { key, name, platforms: [] as Platform[], chatCount: 0, messageCount: 0, notMe: 0, meHint: 0 };
      if (!p.platforms.includes(chat.platform)) p.platforms.push(chat.platform);
      p.chatCount++;
      p.messageCount += counts.get(name) ?? 0;
      parts.set(key, p);
    }
    for (const n of chat.notMeHints) {
      const p = parts.get(normName(n));
      if (p) p.notMe++;
    }
    for (const n of chat.meHints) {
      const p = parts.get(normName(n));
      if (p) p.meHint++;
    }
  }

  const list = [...parts.values()].sort((a, b) => b.chatCount - a.chatCount || b.messageCount - a.messageCount);
  const suggestedMe = suggestMe(ds, list);

  const yearList = [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
  const current = now.getFullYear();
  let defaultYear: number | 'all' = years.has(current) ? current : (yearList[0]?.year ?? current);
  // Wrapped season spills into January/February: if last year has more data, show last year.
  if (now.getMonth() <= 1 && (years.get(current - 1) ?? 0) > (years.get(current) ?? 0)) defaultYear = current - 1;

  return {
    chatCount: ds.chats.length,
    messageCount,
    whatsappChats: ds.chats.filter((c) => c.platform === 'whatsapp').length,
    instagramThreads: ds.chats.filter((c) => c.platform === 'instagram').length,
    instagramSources: ds.instagram?.sources ?? [],
    participants: list.map(({ name, platforms, chatCount, messageCount: mc }) => ({ name, platforms, chatCount, messageCount: mc })),
    suggestedMe,
    years: yearList,
    defaultYear,
    warnings: ds.warnings,
  };
}

function suggestMe(
  ds: Dataset,
  list: (ParticipantSummary & { key: string; notMe: number; meHint: number })[],
): string[] {
  const out = new Set<string>();
  for (const platform of ['whatsapp', 'instagram'] as Platform[]) {
    const chats = ds.chats.filter((c) => c.platform === platform);
    if (!chats.length) continue;

    if (platform === 'instagram' && ds.instagram?.profile?.name) {
      const p = list.find((x) => x.key === normName(ds.instagram!.profile!.name!));
      if (p) {
        out.add(p.name);
        continue;
      }
    }

    const scored = list
      .filter((p) => p.platforms.includes(platform))
      .map((p) => {
        const inChats = chats.filter((c) => c.participants.some((n) => normName(n) === p.key)).length;
        // You're in every chat you exported; hints are strong evidence either way.
        return { p, score: inChats * 10 + p.meHint * 25 - p.notMe * 50 };
      })
      .sort((a, b) => b.score - a.score || b.p.messageCount - a.p.messageCount);
    const best = scored[0];
    if (best && best.score > 0) out.add(best.p.name);
  }
  return [...out];
}
