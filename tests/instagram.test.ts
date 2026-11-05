import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { fixMojibake, parseMetaJson } from '../src/parsers/instagram/mojibake';
import { classifyPath, parseInstagram, type JsonSource } from '../src/parsers/instagram/parseInstagram';
import { ingest } from '../src/parsers/ingest';
import { summarize } from '../src/stats/summary';
import { computeStats } from '../src/stats/compute';

const root = fileURLToPath(new URL('./fixtures/instagram/', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
function sources(sub: string): JsonSource[] {
  return walk(join(root, sub))
    .filter((p) => p.endsWith('.json'))
    .map((p) => ({ path: relative(join(root, sub), p), read: async () => readFileSync(p, 'utf8') }));
}
async function zipOf(sub: string): Promise<Blob> {
  const zip = new JSZip();
  for (const p of walk(join(root, sub))) zip.file(relative(join(root, sub), p), readFileSync(p));
  const buf = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([buf as Uint8Array<ArrayBuffer>]);
}

describe('mojibake', () => {
  it('fixes UTF-8-as-latin1 emoji and Hindi', () => {
    expect(fixMojibake('ð\u009f\u0098\u0082')).toBe('😂');
    expect(fixMojibake('à¤¹à¥\u0088')).toBe('है');
    expect(parseMetaJson('{"a":"\\u00f0\\u009f\\u0094\\u00a5 lit"}')).toEqual({ a: '🔥 lit' });
  });
  it('leaves proper text alone', () => {
    expect(fixMojibake('café')).toBe('café');
    expect(fixMojibake('already 😂 fine')).toBe('already 😂 fine');
    expect(fixMojibake('plain ascii')).toBe('plain ascii');
  });
});

describe('Instagram file discovery', () => {
  it('classifies by file name anywhere in the tree', () => {
    expect(classifyPath('your_instagram_activity/messages/inbox/a_1/message_1.json')).toBe('dm');
    expect(classifyPath('messages/inbox/a_1/message_12.json')).toBe('dm');
    expect(classifyPath('x/messages/message_requests/a/message_1.json')).toBeNull();
    expect(classifyPath('anything/likes/liked_posts.json')).toBe('like');
    expect(classifyPath('your_instagram_activity/saved/saved_posts.json')).toBe('saved');
    expect(classifyPath('your_instagram_activity/story_sticker_interactions/polls.json')).toBe('story');
    expect(classifyPath('your_instagram_activity/comments/post_comments_1.json')).toBe('comment');
    expect(classifyPath('media/posts/202601/photo.jpg')).toBeNull();
    expect(classifyPath('ads_information/ads_interests.json')).toBeNull();
  });
});

describe('parseInstagram (current layout)', async () => {
  const warnings: string[] = [];
  const { chats, activity } = await parseInstagram(sources('export-new'), { onWarning: (w) => warnings.push(w) });

  it('merges message_1 + message_2 of one thread and sorts by time', () => {
    const maya = chats.find((c) => c.title === 'Maya Chen')!;
    expect(maya.isGroup).toBe(false);
    expect(maya.messages).toHaveLength(7);
    expect(maya.messages[0]!.ts).toBeLessThan(maya.messages.at(-1)!.ts);
    expect(maya.notMeHints).toEqual(['Maya Chen']);
  });

  it('fixes mojibake in content, titles and names', () => {
    const maya = chats.find((c) => c.title === 'Maya Chen')!;
    const texts = maya.messages.map((m) => m.text);
    expect(texts).toContain('haha that reel 😂😂');
    expect(texts).toContain('नमस्ते! कैसे हो?');
    expect(chats.some((c) => c.title === 'the gang 🔥')).toBe(true);
  });

  it('classifies reactions as system, shares/photos as media, calls as calls', () => {
    const maya = chats.find((c) => c.title === 'Maya Chen')!;
    expect(maya.messages.filter((m) => m.kind === 'system')).toHaveLength(1);
    expect(maya.messages.filter((m) => m.kind === 'media')).toHaveLength(2);
    const gang = chats.find((c) => c.title === 'the gang 🔥')!;
    expect(gang.isGroup).toBe(true);
    expect(gang.messages.filter((m) => m.kind === 'call')).toHaveLength(1);
  });

  it('skips message requests', () => {
    expect(chats.some((c) => c.title === 'Spam Bot')).toBe(false);
  });

  it('reads likes (classic + label_values), saved, stories, comments with accounts', () => {
    const by = (k: string) => activity.interactions.filter((i) => i.kind === k);
    expect(by('like')).toHaveLength(4);
    expect(by('like').filter((i) => i.account === 'travelwithzoe')).toHaveLength(3);
    expect(by('saved')[0]!.account).toBe('foodie.mumbai');
    expect(by('story')).toHaveLength(3);
    expect(by('story').map((i) => i.detail).sort()).toEqual(['polls', 'story_likes', 'story_likes']);
    expect(by('comment')[0]!.account).toBe('foodie.mumbai');
    expect(by('like')[0]!.ts).toBe(1767268800 * 1000);
  });

  it('reads the profile and reports sources', () => {
    expect(activity.profile).toEqual({ username: 'aarav.codes', name: 'Aarav Sharma' });
    expect(activity.sources.sort()).toEqual(['comments', 'likes', 'messages', 'profile', 'saved', 'stories']);
    expect(warnings).toEqual([]);
  });
});

describe('Instagram via ingest + stats', () => {
  it('reads an Instagram zip end-to-end and suggests the owner as "me"', async () => {
    const ds = await ingest([{ name: 'instagram-aarav.codes-2026.zip', blob: await zipOf('export-new') }]);
    expect(ds.instagram).not.toBeNull();
    const s = summarize(ds, new Date(2026, 10, 1));
    expect(s.suggestedMe).toEqual(['Aarav Sharma']);
    const stats = computeStats(ds, { me: s.suggestedMe, year: 2026 });
    expect(stats.instagram!.likes).toBe(4);
    expect(stats.instagram!.topAccounts[0]!.account).toBe('travelwithzoe');
    expect(stats.instagram!.dmsSent).toBeGreaterThan(0);
    expect(stats.people!.top[0]!.name).toBe('Maya Chen');
  });

  it('reads the old layout and loose JSON files', async () => {
    const files = sources('export-old').map((s) => ({ name: s.path, blob: new Blob([readFileSync(join(root, 'export-old', s.path))]) }));
    const ds = await ingest(files);
    expect(ds.chats).toHaveLength(1);
    expect(ds.chats[0]!.messages[0]!.text).toBe('bhai 😎');
  });

  it('warns about HTML exports instead of crashing', async () => {
    const ds = await ingest([{ name: 'instagram-html.zip', blob: await zipOf('export-html') }]);
    expect(ds.chats).toHaveLength(0);
    expect(ds.warnings[0]).toMatch(/HTML/);
  });

  it('survives corrupt / unexpected JSON', async () => {
    const ds = await ingest([
      { name: 'liked_posts.json', blob: new Blob(['{ not json']) },
      { name: 'message_1.json', blob: new Blob(['{"participants": "weird", "messages": [null, 5, {"timestamp_ms": "x"}]}']) },
      { name: 'saved_posts.json', blob: new Blob(['{"saved_saved_media": [{"title": 1}, null]}']) },
    ]);
    expect(ds.chats.every((c) => c.messages.length === 0)).toBe(true);
    const stats = computeStats(ds, { me: ['x'], year: 2026 });
    expect(stats.totals).toBeNull();
  });
});
