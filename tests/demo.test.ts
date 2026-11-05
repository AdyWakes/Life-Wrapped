import { describe, expect, it } from 'vitest';
import { generateDemoFiles, DEMO_ME } from '../src/demo/generateDemo';
import { ingest } from '../src/parsers/ingest';
import { summarize } from '../src/stats/summary';
import { computeStats } from '../src/stats/compute';
import { buildCards } from '../src/cards/registry';

describe('demo mode', () => {
  it('generates files that go through the real parsers and fill all 8 cards', async () => {
    const now = new Date(2026, 11, 1, 12);
    const t0 = performance.now();
    const files = generateDemoFiles(now);
    const ds = await ingest(files, { localeHint: 'en-IN' });
    const summary = summarize(ds, now);
    const stats = computeStats(ds, { me: summary.suggestedMe, year: summary.defaultYear });
    const ms = performance.now() - t0;

    expect(ds.warnings).toEqual([]);
    expect(summary.suggestedMe).toEqual([DEMO_ME]);
    expect(summary.defaultYear).toBe(2026);
    expect(ds.chats.filter((c) => c.platform === 'whatsapp')).toHaveLength(7);
    expect(ds.chats.filter((c) => c.platform === 'instagram')).toHaveLength(2);

    const cards = buildCards(stats);
    expect(cards.map((c) => c.id)).toEqual(['total', 'people', 'time', 'words', 'streak', 'replies', 'instagram', 'personality']);
    expect(stats.people!.top[0]!.name).toBe('Priya');
    expect(stats.streak!.name).toBe('Priya');
    expect(stats.streak!.days).toBeGreaterThan(100);
    expect(stats.replies!.fastest!.name).toBe('Priya');
    expect(stats.personality!.title).toBe('Night Owl Yapper');
    expect(stats.words!.topWords.length).toBeGreaterThan(5);
    expect(stats.instagram!.likes).toBe(1460);
    // Maya is on both WhatsApp and Instagram -> merged into one person
    expect(stats.people!.top.find((p) => p.name === 'Maya Chen')?.platforms.sort()).toEqual(['instagram', 'whatsapp']);
    expect(ms).toBeLessThan(8000);
    // eslint-disable-next-line no-console
    console.log(`demo: ${summary.messageCount} messages in ${Math.round(ms)}ms ->`, stats.personality!.title, stats.personality!.traits.map((t) => t.label));
  });

  it('is deterministic', () => {
    const now = new Date(2026, 5, 1);
    const a = generateDemoFiles(now).map((f) => f.blob.size);
    const b = generateDemoFiles(now).map((f) => f.blob.size);
    expect(a).toEqual(b);
  });
});
