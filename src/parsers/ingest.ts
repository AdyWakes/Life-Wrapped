import type { Chat, Dataset } from '../types';
import { looksLikeWhatsApp, parseWhatsApp } from './whatsapp/parseWhatsApp';
import { titleFromFileName } from './whatsapp/patterns';
import { isZip, openZip, type ZipEntry } from './zip';
import { isInstagramPath, parseInstagram, type JsonSource } from './instagram/parseInstagram';

export interface InputFile {
  name: string;
  blob: Blob;
}

export type ProgressFn = (fraction: number, label: string) => void;

export interface IngestOptions {
  localeHint?: string;
  onProgress?: ProgressFn;
}

/**
 * Turn whatever the user dropped (WhatsApp .txt / .zip, Instagram .zip / loose .json files)
 * into one Dataset. Never throws: anything we can't read becomes a warning.
 */
export async function ingest(files: InputFile[], opts: IngestOptions = {}): Promise<Dataset> {
  const chats: Chat[] = [];
  const warnings: string[] = [];
  const igSources: JsonSource[] = [];
  const progress = opts.onProgress ?? (() => {});
  const totalBytes = files.reduce((n, f) => n + Math.max(1, f.blob.size), 0) || 1;
  let doneBytes = 0;

  for (const file of files) {
    const weight = Math.max(1, file.blob.size) / totalBytes;
    const base = doneBytes / totalBytes;
    const sub: ProgressFn = (f, label) => progress(Math.min(0.95, base + f * weight * 0.95), label);
    const lower = file.name.toLowerCase();
    try {
      if ((await isZip(file.blob)) || lower.endsWith('.zip')) {
        sub(0, `Opening ${file.name}`);
        const entries = await openZip(file.blob);
        await ingestZip(file.name, entries, chats, igSources, warnings, opts, sub);
      } else if (lower.endsWith('.json')) {
        igSources.push({ path: (file as { path?: string }).path ?? file.name, read: () => file.blob.text() });
      } else if (lower.endsWith('.html') && /message_\d+|liked_posts|saved_posts/.test(lower)) {
        warnings.push(`${file.name}: Instagram HTML exports aren't supported — request your data in JSON format.`);
      } else {
        sub(0, `Reading ${file.name}`);
        const text = await file.blob.text();
        if (looksLikeWhatsApp(text)) {
          const { chat } = parseWhatsApp(text, {
            fileName: file.name,
            localeHint: opts.localeHint,
            onProgress: (f) => sub(f, `Parsing ${file.name}`),
          });
          if (chat.messages.length) chats.push(chat);
          else warnings.push(`${file.name}: no messages found.`);
        } else {
          warnings.push(`${file.name}: doesn't look like a WhatsApp chat or Instagram export — skipped.`);
        }
      }
    } catch (err) {
      warnings.push(`${file.name}: couldn't be read (${errMessage(err)}) — skipped.`);
    }
    doneBytes += Math.max(1, file.blob.size);
  }

  let instagram: Dataset['instagram'] = null;
  if (igSources.length) {
    progress(0.95, 'Reading Instagram data');
    try {
      const ig = await parseInstagram(igSources, { onWarning: (w) => warnings.push(w) });
      chats.push(...ig.chats);
      if (ig.activity.interactions.length || ig.activity.profile || ig.chats.length) instagram = ig.activity;
    } catch (err) {
      warnings.push(`Instagram data couldn't be read (${errMessage(err)}).`);
    }
  }

  progress(1, 'Done');
  return { chats, instagram, warnings };
}

async function ingestZip(
  zipName: string,
  entries: ZipEntry[],
  chats: Chat[],
  igSources: JsonSource[],
  warnings: string[],
  opts: IngestOptions,
  progress: ProgressFn,
) {
  const ig = entries.filter((e) => e.path.toLowerCase().endsWith('.json') && isInstagramPath(e.path));
  for (const e of ig) igSources.push({ path: e.path, read: () => e.readText() });

  const txts = entries.filter((e) => e.path.toLowerCase().endsWith('.txt') && !e.path.includes('__MACOSX'));
  // Prefer the chat files WhatsApp itself writes.
  txts.sort((a, b) => rank(a.path) - rank(b.path));
  let found = 0;
  for (let i = 0; i < txts.length; i++) {
    const entry = txts[i]!;
    if (entry.size > 0 && entry.size < 20) continue;
    const text = await entry.readText();
    if (!looksLikeWhatsApp(text)) continue;
    const inner = entry.path.split('/').pop() ?? entry.path;
    // "_chat.txt" (iOS) carries no name: use the zip's name ("WhatsApp Chat - Priya.zip").
    const fileName = titleFromFileName(inner) ? inner : zipName;
    const { chat } = parseWhatsApp(text, {
      fileName,
      localeHint: opts.localeHint,
      onProgress: (f) => progress((i + f) / txts.length, `Parsing ${zipName}`),
    });
    if (chat.messages.length) {
      chats.push(chat);
      found++;
    }
  }
  if (!found && !ig.length) {
    const hasHtml = entries.some((e) => /\.html$/i.test(e.path) && /messages|likes/i.test(e.path));
    warnings.push(
      hasHtml
        ? `${zipName}: looks like an Instagram HTML export — please request JSON format instead.`
        : `${zipName}: no WhatsApp chat or Instagram JSON found inside.`,
    );
  }
}

function rank(path: string): number {
  const name = path.split('/').pop()?.toLowerCase() ?? '';
  if (name === '_chat.txt') return 0;
  if (name.startsWith('whatsapp')) return 1;
  return 2;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
