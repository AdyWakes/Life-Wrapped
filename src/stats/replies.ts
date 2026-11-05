import type { Message } from '../types';
import { median } from './dates';

/** Gaps longer than this are a new conversation, not a reply. */
export const MAX_REPLY_GAP_MS = 24 * 3_600_000;

/**
 * Reply time = time between the *last* message of the other person's turn and the first message
 * of the next turn. Returns the medians for both directions in a 1:1 chat.
 */
export function replyTimes(messages: Message[], isMe: (sender: string) => boolean) {
  const mine: number[] = [];
  const theirs: number[] = [];
  let prev: Message | null = null;
  for (const m of messages) {
    if (m.kind === 'system' || m.kind === 'call') continue;
    if (prev && isMe(prev.sender) !== isMe(m.sender)) {
      const gap = m.ts - prev.ts;
      if (gap >= 0 && gap <= MAX_REPLY_GAP_MS) (isMe(m.sender) ? mine : theirs).push(gap);
    }
    prev = m;
  }
  return { mine, theirs, myMedian: median(mine), theirMedian: median(theirs) };
}
