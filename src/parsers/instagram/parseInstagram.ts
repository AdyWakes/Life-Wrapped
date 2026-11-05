import type { Chat, InstagramActivity, Interaction, InteractionKind, Message, MessageKind } from '../../types';
import { parseMetaJson } from './mojibake';

export interface JsonSource {
  path: string;
  read(): Promise<string>;
}

type FileKind = 'dm' | 'like' | 'saved' | 'story' | 'comment' | 'profile';

/**
 * Classify by file name/folder, NOT by a hardcoded full path — Meta keeps moving things
 * (messages/inbox → your_instagram_activity/messages/inbox, etc.).
 */
export function classifyPath(path: string): FileKind | null {
  const p = path.toLowerCase().replace(/\\/g, '/');
  const base = p.split('/').pop() ?? p;
  if (!base.endsWith('.json')) return null;
  if (/^message_\d+\.json$/.test(base)) {
    if (/\/(message_requests|filtered_threads)\//.test(p)) return null; // not your conversations
    return 'dm';
  }
  if (/^liked_posts(_\d+)?\.json$/.test(base)) return 'like';
  if (/^saved_posts(_\d+)?\.json$/.test(base)) return 'saved';
  if (/^(post_comments|reels_comments|comments)(_\d+)?\.json$/.test(base)) return 'comment';
  if (/^personal_information\.json$/.test(base)) return 'profile';
  if (/story/.test(p) && /^(story_likes|polls|quizzes|emoji_sliders|questions|countdowns|story_reaction_sticker_reactions|emoji_story_reactions|reaction_stickers?|story_reactions?|quiz|question)(_\d+)?\.json$/.test(base)) {
    return 'story';
  }
  return null;
}

export function isInstagramPath(path: string): boolean {
  return classifyPath(path) !== null;
}

/** Fallback for loose files with unusual names: look at the JSON's top-level keys. */
function classifyContent(data: unknown): FileKind | null {
  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    if (first && typeof first === 'object' && JSON.stringify(first).includes('Media Owner')) return 'comment';
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.participants) && Array.isArray(o.messages)) return 'dm';
  const keys = Object.keys(o);
  if (keys.includes('profile_user')) return 'profile';
  if (keys.some((k) => k.startsWith('likes_media'))) return 'like';
  if (keys.some((k) => k.startsWith('saved_saved'))) return 'saved';
  if (keys.some((k) => k.startsWith('story_activities'))) return 'story';
  if (keys.some((k) => k.startsWith('comments_'))) return 'comment';
  return null;
}

export interface InstagramParseResult {
  chats: Chat[];
  activity: InstagramActivity;
}

export async function parseInstagram(
  sources: JsonSource[],
  opts: { onWarning?: (w: string) => void } = {},
): Promise<InstagramParseResult> {
  const warn = opts.onWarning ?? (() => {});
  const threads = new Map<string, { title: string; participants: Set<string>; messages: Message[]; path: string }>();
  const interactions: Interaction[] = [];
  const found = new Set<string>();
  let profile: InstagramActivity['profile'];

  for (const src of sources) {
    if (/\/(message_requests|filtered_threads)\//i.test(src.path.replace(/\\/g, '/'))) continue;
    let kind = classifyPath(src.path);
    let data: unknown;
    try {
      data = parseMetaJson(await src.read());
    } catch {
      if (kind) warn(`${src.path}: invalid JSON — skipped.`);
      continue;
    }
    kind ??= classifyContent(data);
    if (!kind) continue;
    try {
      if (kind === 'dm') {
        addThread(src.path, data, threads);
        found.add('messages');
      } else if (kind === 'profile') {
        profile = readProfile(data) ?? profile;
        if (profile) found.add('profile');
      } else {
        const ik: InteractionKind = kind === 'like' ? 'like' : kind === 'saved' ? 'saved' : kind === 'story' ? 'story' : 'comment';
        const detail = kind === 'story' ? (src.path.split('/').pop() ?? '').replace(/(_\d+)?\.json$/i, '') : undefined;
        const before = interactions.length;
        for (const item of records(data)) {
          const it = readInteraction(item, ik, detail);
          if (it) interactions.push(it);
        }
        if (interactions.length > before) found.add(ik === 'like' ? 'likes' : ik === 'saved' ? 'saved' : ik === 'story' ? 'stories' : 'comments');
      }
    } catch (err) {
      warn(`${src.path}: couldn't be read (${err instanceof Error ? err.message : String(err)}) — skipped.`);
    }
  }

  const chats: Chat[] = [];
  for (const [key, t] of threads) {
    if (!t.messages.length) continue;
    t.messages.sort((a, b) => a.ts - b.ts);
    const senders = new Set(t.messages.filter((m) => m.kind !== 'system').map((m) => m.sender));
    const participants = [...new Set([...t.participants, ...senders])].filter(Boolean);
    const isGroup = participants.length > 2;
    chats.push({
      id: `ig:${key}`,
      platform: 'instagram',
      title: t.title || participants.join(', '),
      isGroup,
      participants,
      messages: t.messages,
      sourceFile: t.path,
      notMeHints: !isGroup && t.title && participants.includes(t.title) ? [t.title] : [],
      meHints: [],
    });
  }

  return { chats, activity: { interactions, profile, sources: [...found] } };
}

// ------------------------------------------------------------------------------------------------

interface RawThread {
  participants?: { name?: string }[];
  messages?: RawMessage[];
  title?: string;
  thread_path?: string;
}
interface RawMessage {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  photos?: unknown[];
  videos?: unknown[];
  audio_files?: unknown[];
  gifs?: unknown[];
  files?: unknown[];
  sticker?: unknown;
  share?: unknown;
  call_duration?: number;
  is_unsent?: boolean;
}

function addThread(
  path: string,
  data: unknown,
  threads: Map<string, { title: string; participants: Set<string>; messages: Message[]; path: string }>,
) {
  const raw = data as RawThread;
  if (!raw || !Array.isArray(raw.messages)) return;
  const dir = path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  const participants = (raw.participants ?? []).map((p) => p?.name ?? '').filter(Boolean);
  const key = raw.thread_path || (dir && !/^\.?$/.test(dir) ? dir : `${raw.title ?? ''}|${participants.sort().join(',')}`);
  let t = threads.get(key);
  if (!t) {
    t = { title: raw.title ?? '', participants: new Set(), messages: [], path };
    threads.set(key, t);
  }
  for (const p of participants) t.participants.add(p);
  for (const m of raw.messages) {
    if (!m || typeof m.timestamp_ms !== 'number') continue;
    const kind = messageKind(m);
    t.messages.push({
      ts: m.timestamp_ms,
      sender: kind === 'system' ? '' : (m.sender_name ?? ''),
      kind,
      text: kind === 'text' ? (m.content ?? '') : '',
    });
  }
}

const IG_SYSTEM = [
  /^reacted .{1,12} to your message/i,
  /^liked a message$/i,
  /^.{1,80} (created|named) the group/i,
  /^.{1,80} (added|removed) .{1,80} (to|from) the group/i,
  /^.{1,80} left the group/i,
  /^.{1,80} changed the (group|theme|chat)/i,
  /^you are now connected on messenger/i,
  /^this message was unsent/i,
];
const IG_MEDIA = [/sent an attachment\.?$/i, /^.{1,80} shared a (story|post|reel)/i, /^.{1,80} sent a (voice message|photo|video|gif|sticker)/i, /^https?:\/\/\S+$/];

function messageKind(m: RawMessage): MessageKind {
  if (m.is_unsent) return 'deleted';
  if (typeof m.call_duration === 'number') return 'call';
  const c = m.content?.trim() ?? '';
  if (c && IG_SYSTEM.some((p) => p.test(c))) return 'system';
  if (m.photos || m.videos || m.audio_files || m.gifs || m.files || m.sticker || m.share) return 'media';
  if (!c) return 'media';
  if (IG_MEDIA.some((p) => p.test(c))) return 'media';
  return 'text';
}

/** Every record-looking object in a likes/saved/story/comments file, whatever the wrapper key. */
function records(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isObj);
  if (!isObj(data)) return [];
  const out: Record<string, unknown>[] = [];
  for (const v of Object.values(data)) if (Array.isArray(v)) out.push(...v.filter(isObj));
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readInteraction(item: Record<string, unknown>, kind: InteractionKind, detail?: string): Interaction | null {
  const ts = findTimestamp(item, 0);
  if (!ts) return null;
  const account = findAccount(item);
  return { ts, kind, ...(account ? { account } : {}), ...(detail ? { detail } : {}) };
}

function toMs(n: number): number {
  return n < 1e11 ? n * 1000 : n;
}

function findTimestamp(v: unknown, depth: number): number | null {
  if (depth > 5 || !v || typeof v !== 'object') return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const t = findTimestamp(x, depth + 1);
      if (t) return t;
    }
    return null;
  }
  const o = v as Record<string, unknown>;
  for (const k of ['timestamp', 'timestamp_ms', 'creation_timestamp', 'taken_at']) {
    const n = o[k];
    if (typeof n === 'number' && n > 0) return toMs(n);
  }
  for (const x of Object.values(o)) {
    const t = findTimestamp(x, depth + 1);
    if (t) return t;
  }
  return null;
}

const USERNAME_RE = /^[a-z0-9._]{1,30}$/i;
const OWNER_LABELS = /^(media owner|owner|username|account|author|user ?name)$/i;

function findAccount(item: Record<string, unknown>): string | undefined {
  // Classic format: { title: "username", string_list_data: [...] }
  const title = item.title;
  if (typeof title === 'string' && USERNAME_RE.test(title.trim())) return title.trim();
  // string_map_data: { "Media Owner": { value: "username" } }
  const smd = item.string_map_data;
  if (isObj(smd)) {
    for (const [k, v] of Object.entries(smd)) {
      if (OWNER_LABELS.test(k) && isObj(v) && typeof v.value === 'string' && v.value) return v.value;
    }
  }
  // New label_values format: [{ label: "Username", value: "x" }, { title: "Owner", dict: [...] }]
  const fromLabels = findLabelValue(item.label_values, 0);
  if (fromLabels) return fromLabels;
  // Last resort: a story URL contains the username
  const href = JSON.stringify(item).match(/instagram\.com\/(?:stories\/)?([a-z0-9._]{1,30})\//i);
  if (href?.[1] && !['p', 'reel', 'reels', 'stories', 'tv', 'explore'].includes(href[1].toLowerCase())) return href[1];
  return typeof title === 'string' && title.trim() && !/^https?:/i.test(title) ? title.trim() : undefined;
}

function findLabelValue(v: unknown, depth: number): string | undefined {
  if (depth > 6 || !v) return undefined;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findLabelValue(x, depth + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (!isObj(v)) return undefined;
  if (typeof v.label === 'string' && /^(username|user ?name)$/i.test(v.label) && typeof v.value === 'string' && v.value) return v.value;
  for (const x of Object.values(v)) {
    if (typeof x === 'object') {
      const r = findLabelValue(x, depth + 1);
      if (r) return r;
    }
  }
  return undefined;
}

function readProfile(data: unknown): InstagramActivity['profile'] | undefined {
  let username: string | undefined;
  let name: string | undefined;
  const walk = (v: unknown, depth: number) => {
    if (depth > 6 || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    const o = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(o)) {
      if (isObj(val) && typeof val.value === 'string') {
        if (/^username$/i.test(k)) username ??= val.value;
        if (/^name$/i.test(k)) name ??= val.value;
      }
      if (typeof o.label === 'string' && typeof o.value === 'string') {
        if (/^username$/i.test(o.label)) username ??= o.value;
        if (/^name$/i.test(o.label)) name ??= o.value;
      }
      walk(val, depth + 1);
    }
  };
  walk(data, 0);
  return username || name ? { username, name } : undefined;
}
