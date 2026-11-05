import type { Dataset, StatsOptions } from '../types';
import type { InstagramStats } from './types';

export function computeInstagram(
  ds: Dataset,
  _opts: StatsOptions,
  isMe: (s: string) => boolean,
  inYear: (ts: number) => boolean,
): InstagramStats | null {
  let dmsSent = 0;
  let dmsReceived = 0;
  let threads = 0;
  const dmPeople = new Map<string, { name: string; total: number }>();
  for (const chat of ds.chats) {
    if (chat.platform !== 'instagram') continue;
    let n = 0;
    for (const m of chat.messages) {
      if (m.kind === 'system' || m.kind === 'call' || !inYear(m.ts)) continue;
      n++;
      if (isMe(m.sender)) dmsSent++;
      else dmsReceived++;
    }
    if (!n) continue;
    threads++;
    if (!chat.isGroup) {
      const other = chat.participants.find((p) => !isMe(p)) ?? chat.title;
      const cur = dmPeople.get(other) ?? { name: other, total: 0 };
      cur.total += n;
      dmPeople.set(other, cur);
    }
  }

  const ig = ds.instagram;
  let likes = 0;
  let saved = 0;
  let stories = 0;
  let comments = 0;
  const accounts = new Map<string, InstagramStats['topAccounts'][number]>();
  for (const it of ig?.interactions ?? []) {
    if (!inYear(it.ts)) continue;
    if (it.kind === 'like') likes++;
    else if (it.kind === 'saved') saved++;
    else if (it.kind === 'story') stories++;
    else if (it.kind === 'comment') comments++;
    if (!it.account) continue;
    const a = accounts.get(it.account) ?? { account: it.account, likes: 0, stories: 0, comments: 0, saved: 0, total: 0 };
    if (it.kind === 'like') a.likes++;
    else if (it.kind === 'saved') a.saved++;
    else if (it.kind === 'story') a.stories++;
    else a.comments++;
    a.total++;
    accounts.set(it.account, a);
  }

  if (!dmsSent && !dmsReceived && !likes && !saved && !stories && !comments) return null;
  return {
    dmsSent,
    dmsReceived,
    threads,
    likes,
    saved,
    stories,
    comments,
    topAccounts: [...accounts.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    topDmPeople: [...dmPeople.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    sources: ig?.sources ?? [],
  };
}
