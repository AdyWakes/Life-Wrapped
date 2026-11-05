import type { Chat, Message, MessageKind } from '../../types';
import { detectDateOrder, to24h, toYMD, type DateTriple } from './dateFormat';
import {
  CALL_PATTERNS,
  DELETED_BY_ME,
  DELETED_PATTERNS,
  FAKE_SENDER_RE,
  GROUP_EVENT_PATTERNS,
  HEADER_RE,
  INVISIBLE,
  MEDIA_PATTERNS,
  cleanName,
  titleFromFileName,
} from './patterns';

export interface WhatsAppParseOptions {
  fileName?: string;
  /** e.g. navigator.language — only used when the date order can't be inferred from the data. */
  localeHint?: string;
  /** Called with 0..1 while parsing. */
  onProgress?: (fraction: number) => void;
}

export interface WhatsAppParseResult {
  chat: Chat;
  dateOrder: string;
  lineCount: number;
}

interface Header {
  line: number;
  bracket: boolean;
  date: DateTriple;
  h: number;
  mi: number;
  s: number;
  ampm?: string;
  rest: string;
}

const ENCRYPTION_TEXT = /^(messages (and calls )?(to this (group|chat) )?(are|were) (now )?(end-to-end encrypted|secured with end-to-end encryption))/i;
const EDITED_SUFFIX = /\s*<(this message was edited|se editó este mensaje|diese nachricht wurde bearbeitet|ce message a été modifié|essa mensagem foi editada)>\s*$/i;

/** True if the text looks like a WhatsApp export (≥2 header lines in the first 40 non-empty lines). */
export function looksLikeWhatsApp(text: string): boolean {
  let checked = 0;
  let hits = 0;
  for (const raw of text.slice(0, 20000).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (HEADER_RE.test(raw)) hits++;
    if (++checked >= 40) break;
  }
  return hits >= 2 || (hits === 1 && checked <= 2);
}

export function parseWhatsApp(input: string, opts: WhatsAppParseOptions = {}): WhatsAppParseResult {
  const text = input.replace(/^﻿/, '');
  const lines = text.split(/\r\n|\n|\r/);
  const total = lines.length;
  const progressEvery = Math.max(2000, Math.floor(total / 50));

  // ---- Pass 1: find header lines --------------------------------------------------------------
  const headers: Header[] = [];
  let bracketCount = 0;
  for (let i = 0; i < total; i++) {
    const line = lines[i]!;
    if (line.length < 8) continue;
    const m = HEADER_RE.exec(line);
    if (!m) continue;
    const open = m[1] === '[';
    const sep = m[9]!;
    const close = sep.startsWith(']');
    if (open !== close) continue; // "[date, time - " or "date, time] " are not real headers
    const a = +m[2]!;
    const b = +m[3]!;
    const c = +m[4]!;
    const h = +m[5]!;
    const mi = +m[6]!;
    if (h > 23 || mi > 59) continue;
    if (m[8] && (h > 12 || h === 0)) continue;
    headers.push({
      line: i,
      bracket: open,
      date: { a, b, c, aLen: m[2]!.length },
      h,
      mi,
      s: m[7] ? +m[7] : 0,
      ampm: m[8],
      rest: m[10] ?? '',
    });
    if (open) bracketCount++;
    if (opts.onProgress && i % progressEvery === 0) opts.onProgress((i / total) * 0.5);
  }

  // Lines in a style different from the overwhelmingly dominant one are pasted text, not headers.
  const dominantBracket = bracketCount >= headers.length / 2;
  const dominantShare = headers.length ? Math.max(bracketCount, headers.length - bracketCount) / headers.length : 1;
  const realHeaders = dominantShare >= 0.95 ? headers.filter((hd) => hd.bracket === dominantBracket) : headers;

  const order = detectDateOrder(
    realHeaders.map((hd) => hd.date),
    opts.localeHint,
  );

  // ---- Pass 2: build messages ------------------------------------------------------------------
  const messages: Message[] = [];
  const senderCounts = new Map<string, number>();
  const meHints = new Set<string>();
  const notMeHints = new Set<string>();
  const systemSenders = new Set<string>();
  let groupEvents = 0;
  let groupTitle: string | null = null;

  const headerAt = new Map<number, Header>();
  for (const hd of realHeaders) headerAt.set(hd.line, hd);

  let current: Message | null = null;
  const firstHeaderLine = realHeaders[0]?.line ?? total;

  for (let i = firstHeaderLine; i < total; i++) {
    const hd = headerAt.get(i);
    if (!hd) {
      // Continuation of a multi-line message.
      if (current && current.kind !== 'system') {
        const extra = lines[i]!.replace(INVISIBLE, '');
        if (current.kind === 'text') current.text += '\n' + extra;
      }
      continue;
    }
    if (opts.onProgress && i % progressEvery === 0) opts.onProgress(0.5 + (i / total) * 0.5);

    const { y, m, d } = toYMD(hd.date, order);
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      // Not a valid date under the detected order -> treat as continuation text.
      if (current && current.kind === 'text') current.text += '\n' + lines[i]!;
      continue;
    }
    const ts = new Date(y, m - 1, d, to24h(hd.h, hd.ampm), hd.mi, hd.s).getTime();

    const msg = classify(hd.rest, hd.bracket);
    if (msg.kind === 'system') {
      if (GROUP_EVENT_PATTERNS.some((p) => p.test(msg.systemText))) groupEvents++;
      const subj = msg.systemText.match(/(?:created group|changed the subject (?:from .* )?to|changed the group name to) [“"](.+)[”"]$/i);
      if (subj?.[1]) groupTitle = subj[1];
      if (msg.sender) {
        systemSenders.add(msg.sender);
        if (ENCRYPTION_TEXT.test(msg.systemText)) notMeHints.add(msg.sender);
      }
      current = { ts, sender: '', kind: 'system', text: '' };
      messages.push(current);
      continue;
    }

    current = { ts, sender: msg.sender, kind: msg.kind, text: msg.kind === 'text' ? msg.text : '' };
    messages.push(current);
    senderCounts.set(msg.sender, (senderCounts.get(msg.sender) ?? 0) + 1);
    if (msg.deletedByMe) meHints.add(msg.sender);
  }

  for (const msg of messages) if (msg.kind === 'text') msg.text = msg.text.trimEnd();

  const participants = [...senderCounts.entries()].sort((x, y2) => y2[1] - x[1]).map(([n]) => n);
  const isGroup = participants.length > 2 || groupEvents > 0;

  // In iOS 1:1 chats the encryption notice is attributed to the *other* person. In groups it is
  // attributed to the group name, which tells us the title.
  if (isGroup) {
    for (const s of systemSenders) if (!senderCounts.has(s) && !groupTitle) groupTitle = s;
    notMeHints.clear();
  }

  const fromFile = opts.fileName ? titleFromFileName(opts.fileName) : null;
  let title = fromFile ?? groupTitle ?? '';
  if (!title) {
    title = isGroup ? 'Group chat' : participants.find((p) => notMeHints.has(p)) ?? participants[1] ?? participants[0] ?? 'Chat';
  }
  if (!isGroup && fromFile) {
    const match = participants.find((p) => p.toLowerCase() === fromFile.toLowerCase());
    if (match) notMeHints.add(match);
  }

  opts.onProgress?.(1);

  const chat: Chat = {
    id: `wa:${hash(`${opts.fileName ?? ''}|${title}|${messages.length}|${messages[0]?.ts ?? 0}`)}`,
    platform: 'whatsapp',
    title,
    isGroup,
    participants,
    messages,
    sourceFile: opts.fileName ?? 'chat.txt',
    notMeHints: [...notMeHints].filter((n) => !meHints.has(n)),
    meHints: [...meHints],
  };
  return { chat, dateOrder: order, lineCount: total };
}

type Classified =
  | { kind: 'system'; sender: string; systemText: string }
  | { kind: Exclude<MessageKind, 'system'>; sender: string; text: string; deletedByMe: boolean };

function classify(rest: string, ios: boolean): Classified {
  const sepIdx = findSenderSeparator(rest);
  if (sepIdx < 0) {
    return { kind: 'system', sender: '', systemText: rest.replace(INVISIBLE, '').trim() };
  }
  const rawSender = rest.slice(0, sepIdx);
  const rawText = rest.slice(sepIdx + 2);
  const sender = cleanName(rawSender);
  const startsInvisible = /^[‎‏]/.test(rawText);
  let text = rawText.replace(INVISIBLE, '').replace(EDITED_SUFFIX, '');
  const probe = text.trim();

  if (DELETED_PATTERNS.some((p) => p.test(probe))) {
    return { kind: 'deleted', sender, text: '', deletedByMe: DELETED_BY_ME.some((p) => p.test(probe)) };
  }
  if (MEDIA_PATTERNS.some((p) => p.test(probe))) return { kind: 'media', sender, text: '', deletedByMe: false };
  if (CALL_PATTERNS.some((p) => p.test(probe)) && (ios || startsInvisible)) {
    return { kind: 'call', sender, text: '', deletedByMe: false };
  }
  if (ENCRYPTION_TEXT.test(probe)) return { kind: 'system', sender, systemText: probe };
  // iOS marks system lines (added / left / changed subject...) with a leading U+200E.
  if (ios && startsInvisible) return { kind: 'system', sender, systemText: probe };
  if (!sender) return { kind: 'system', sender: '', systemText: probe };
  text = text.replace(/\s+$/, '');
  return { kind: 'text', sender, text, deletedByMe: false };
}

/** Index of the ": " that separates sender from text, or -1 for a system line. */
function findSenderSeparator(rest: string): number {
  const idx = rest.indexOf(': ');
  if (idx <= 0 || idx > 120) return -1;
  const candidate = rest.slice(0, idx);
  if (FAKE_SENDER_RE.test(candidate)) return -1;
  return idx;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
