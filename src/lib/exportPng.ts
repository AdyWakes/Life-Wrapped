import { createElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { getFontEmbedCSS, toBlob } from 'html-to-image';
import JSZip from 'jszip';
import { CARD_H, CARD_W, CardModeContext } from '../cards/kit';
import type { CardDef } from '../cards/types';
import type { WrappedStats } from '../stats/types';

/**
 * Render a card at its native 1080×1920 in an off-screen host (static "export" mode, no animations),
 * snapshot it with html-to-image, then tear it down. Everything happens locally on a canvas.
 */
let fontCSS: Promise<string> | null = null;

const isWebKit = () => /AppleWebKit/.test(navigator.userAgent) && !/Chrome|CriOS|Android/.test(navigator.userAgent);

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function withOffscreen<T>(element: ReactElement, fn: (node: HTMLElement) => Promise<T>): Promise<T> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-${CARD_W * 3}px;top:0;width:${CARD_W}px;height:${CARD_H}px;pointer-events:none;z-index:-1;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(createElement(CardModeContext.Provider, { value: 'export' }, element)));
    await document.fonts?.ready;
    await nextFrame();
    await nextFrame();
    const node = host.firstElementChild as HTMLElement;
    return await fn(node);
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Fetch + inline the (self-hosted) fonts once, right after page load, so exporting works even if
 * the user goes offline / into airplane mode after opening the page.
 */
export function warmExport() {
  fontCSS ??= getFontEmbedCSS(document.body).catch(() => '');
}

export async function renderCardBlob(card: CardDef, stats: WrappedStats, index: number, total: number): Promise<Blob> {
  const element = createElement(card.Component, { stats, index, total });
  return withOffscreen(element, async (node) => {
    fontCSS ??= getFontEmbedCSS(node).catch(() => '');
    if (!(await fontCSS)) fontCSS = getFontEmbedCSS(node).catch(() => '');
    const options = {
      width: CARD_W,
      height: CARD_H,
      canvasWidth: CARD_W,
      canvasHeight: CARD_H,
      pixelRatio: 1,
      cacheBust: false,
      fontEmbedCSS: await fontCSS,
      skipAutoScale: true,
    };
    // Safari/WebKit often paints fonts & emoji only from the second render of the SVG.
    if (isWebKit()) {
      await toBlob(node, options);
      await toBlob(node, options);
    }
    const blob = await toBlob(node, options);
    if (!blob) throw new Error('Could not render image');
    return blob;
  });
}

export function cardFileName(card: CardDef, index: number, stats: WrappedStats): string {
  return `lifewrapped-${stats.yearLabel.replace(/\s+/g, '-').toLowerCase()}-${String(index).padStart(2, '0')}-${card.id}.png`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Native share sheet with the PNG attached (mobile Chrome / Safari). Returns false if unsupported. */
export async function shareBlob(blob: Blob, fileName: string, text: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], text });
  } catch (err) {
    // User cancelled the share sheet — that's fine.
    if ((err as DOMException)?.name !== 'AbortError') throw err;
  }
  return true;
}

/** Only offer the share sheet on touch devices; desktops get a plain download. */
export function canShareFiles(): boolean {
  try {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const probe = new File([new Uint8Array([0])], 'x.png', { type: 'image/png' });
    return !!nav.share && !!nav.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

export async function zipAllCards(
  cards: CardDef[],
  stats: WrappedStats,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  for (let i = 0; i < cards.length; i++) {
    onProgress?.(i, cards.length);
    const blob = await renderCardBlob(cards[i]!, stats, i + 1, cards.length);
    zip.file(cardFileName(cards[i]!, i + 1, stats), blob);
  }
  onProgress?.(cards.length, cards.length);
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
