import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { ingest } from '../src/parsers/ingest';
import { openWithJSZip, openZip } from '../src/parsers/zip';

const fx = (name: string) => readFileSync(new URL(`./fixtures/whatsapp/${name}`, import.meta.url), 'utf8');

async function makeZip(files: Record<string, string | Uint8Array>, compression: 'DEFLATE' | 'STORE' = 'DEFLATE') {
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  const buf = await zip.generateAsync({ type: 'uint8array', compression });
  return new Blob([buf as Uint8Array<ArrayBuffer>]);
}

describe('zip reader', () => {
  it('lazy reader and JSZip agree (deflate + store, unicode names)', async () => {
    for (const compression of ['DEFLATE', 'STORE'] as const) {
      const blob = await makeZip({ '_chat.txt': fx('ios-dmy-24h-1to1.txt'), 'media/😀 photo.jpg': new Uint8Array([1, 2, 3]) }, compression);
      const lazy = await openZip(blob);
      const full = await openWithJSZip(blob);
      expect(lazy.map((e) => e.path).sort()).toEqual(full.map((e) => e.path).sort());
      const chat = lazy.find((e) => e.path === '_chat.txt')!;
      expect(await chat.readText()).toBe(fx('ios-dmy-24h-1to1.txt'));
      const img = lazy.find((e) => e.path.endsWith('.jpg'))!;
      expect([...(await img.readBytes())]).toEqual([1, 2, 3]);
    }
  });
});

describe('ingest', () => {
  it('reads an iOS WhatsApp zip (_chat.txt) and names the chat from the zip', async () => {
    const blob = await makeZip({ '_chat.txt': fx('ios-dmy-24h-1to1.txt'), '00000012-PHOTO.jpg': new Uint8Array(100) });
    const ds = await ingest([{ name: 'WhatsApp Chat - Kabir Singh.zip', blob }]);
    expect(ds.chats).toHaveLength(1);
    expect(ds.chats[0]!.title).toBe('Kabir Singh');
    expect(ds.warnings).toEqual([]);
  });

  it('reads multiple .txt chats at once and skips junk with a warning', async () => {
    const progress: number[] = [];
    const ds = await ingest(
      [
        { name: 'WhatsApp Chat with Maya Chen.txt', blob: new Blob([fx('WhatsApp Chat with Maya Chen.txt')]) },
        { name: 'group.txt', blob: new Blob([fx('android-dmy-24h-group.txt')]) },
        { name: 'notes.txt', blob: new Blob(['just some notes']) },
        { name: 'broken.zip', blob: new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 9, 9, 9])]) },
      ],
      { onProgress: (f) => progress.push(f) },
    );
    expect(ds.chats.map((c) => c.title)).toEqual(['Maya Chen', 'group']);
    expect(ds.warnings).toHaveLength(2);
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((p, i) => i === 0 || p >= progress[i - 1]! - 1e-9)).toBe(true);
  });
});
