import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CardDef } from '../cards/types';
import type { WrappedStats } from '../stats/types';
import { CARD_H, CARD_W } from '../cards/kit';
import { canShareFiles, cardFileName, downloadBlob, renderAllCards, renderCardBlob, shareBlob, shareBlobs, zipBlobs } from '../lib/exportPng';
import { REPO_SHORT } from '../lib/config';

interface Props {
  cards: CardDef[];
  stats: WrappedStats;
  onClose: () => void;
}

const ACTION_BAR = 84;

export function Story({ cards, stats, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const progressRef = useRef(0);
  const activeBar = useRef<HTMLDivElement>(null);
  const blobCache = useRef(new Map<number, Blob>());
  const areaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const shareable = useRef(canShareFiles()).current;

  const card = cards[index]!;
  const holding = paused || !!busy;

  // ---- fit the 1080×1920 card into the viewport ----
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / CARD_W, r.height / CARD_H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const indexRef = useRef(0);
  indexRef.current = index;
  const go = useCallback(
    (delta: number) => {
      const next = indexRef.current + delta;
      if (next >= cards.length) {
        setFinished(true);
        progressRef.current = 1;
        return;
      }
      setFinished(false);
      progressRef.current = 0;
      setDir(delta);
      setIndex(Math.max(0, next));
      if (activeBar.current) activeBar.current.style.width = '0%';
    },
    [cards.length],
  );

  // ---- auto-advance timer (writes the bar width straight to the DOM: no re-render per frame) ----
  useEffect(() => {
    if (activeBar.current) activeBar.current.style.width = `${Math.min(100, progressRef.current * 100)}%`;
    if (holding || finished) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      progressRef.current += dt / (card.duration * 1000);
      if (progressRef.current >= 1) {
        progressRef.current = 1;
        go(1);
        return;
      }
      if (activeBar.current) activeBar.current.style.width = `${progressRef.current * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holding, finished, card, go, index]);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // ---- tap / hold / swipe ----
  const pointer = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const holdTimer = useRef<number>(0);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    pointer.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    holdTimer.current = window.setTimeout(() => setPaused(true), 220);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    window.clearTimeout(holdTimer.current);
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const dt = performance.now() - p.t;
    if (dt >= 220) {
      setPaused(false);
      if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return; // was a hold
    }
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);
    if (dy > 110 && Math.abs(dy) > Math.abs(dx)) return onClose();
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      const w = (e.currentTarget as HTMLElement).getBoundingClientRect();
      go(e.clientX - w.left < w.width * 0.3 ? -1 : 1);
    }
  };
  const onPointerCancel = () => {
    window.clearTimeout(holdTimer.current);
    pointer.current = null;
    setPaused(false);
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const exportCurrent = async () => {
    if (busy) return;
    const name = cardFileName(card, index + 1, stats);
    const text = `My ${stats.yearLabel} wrapped ✨ Make yours: ${REPO_SHORT}`;
    let blob = blobCache.current.get(index);
    try {
      if (!blob) {
        setBusy('Rendering image…');
        blob = await renderCardBlob(card, stats, index + 1, cards.length);
        blobCache.current.set(index, blob);
      }
      if (shareable) {
        try {
          if (await shareBlob(blob, name, text)) return;
        } catch (err) {
          // Safari drops the "user gesture" if rendering took too long. The image is cached now,
          // so a second tap shares instantly.
          if ((err as DOMException)?.name === 'NotAllowedError') {
            flash('Image ready — tap Share again');
            return;
          }
          throw err;
        }
      }
      downloadBlob(blob, name);
      flash('Saved PNG ✓');
    } catch (err) {
      console.error(err);
      flash('Couldn’t create the image — try again');
    } finally {
      setBusy(null);
    }
  };

  const exportAll = async () => {
    if (busy) return;
    setBusy(`Rendering 1/${cards.length}`);
    try {
      const blobs = await renderAllCards(cards, stats, blobCache.current, (d, t) => setBusy(`Rendering ${Math.min(d + 1, t)}/${t}`));
      const names = cards.map((c, i) => cardFileName(c, i + 1, stats));
      if (shareable) {
        try {
          if (await shareBlobs(blobs, names, `My ${stats.yearLabel} wrapped ✨ Make yours: ${REPO_SHORT}`)) return;
        } catch (err) {
          if ((err as DOMException)?.name === 'NotAllowedError') {
            flash('Images ready — tap Save all again');
            return;
          }
          // Some share targets refuse many files: fall back to the zip below.
        }
      }
      downloadBlob(await zipBlobs(blobs, names), `lifewrapped-${stats.yearLabel.replace(/\s+/g, '-').toLowerCase()}.zip`);
      flash('Saved all cards ✓');
    } catch (err) {
      console.error(err);
      flash('Couldn’t create the images — try again');
    } finally {
      setBusy(null);
    }
  };

  const restart = () => {
    setFinished(false);
    progressRef.current = 0;
    setDir(-1);
    setIndex(0);
  };

  const Component = card.Component;
  const cardElement = useMemo(() => <Component stats={stats} index={index + 1} total={cards.length} />, [Component, stats, index, cards.length]);
  const cardW = CARD_W * scale;
  const cardH = CARD_H * scale;

  return (
    <div className="no-select fixed inset-0 z-50 flex flex-col bg-black" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <div
        ref={areaRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)', marginBottom: 0 }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative overflow-hidden rounded-[14px] sm:rounded-[22px]" style={{ width: cardW, height: cardH }}>
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={card.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d > 0 ? cardW : -cardW * 0.4, opacity: d > 0 ? 1 : 0, scale: d > 0 ? 1 : 0.92 }),
                center: { x: 0, opacity: 1, scale: 1 },
                exit: (d: number) => ({ x: d > 0 ? -cardW * 0.4 : cardW, opacity: d > 0 ? 0 : 1, scale: d > 0 ? 0.92 : 1 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="absolute left-0 top-0"
              style={{ width: cardW, height: cardH }}
            >
              <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {cardElement}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* progress segments */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 flex gap-1 px-2.5 pt-2.5">
            {cards.map((c, i) => (
              <div key={c.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <div
                  ref={i === index ? activeBar : undefined}
                  className="h-full rounded-full bg-white"
                  style={{ width: `${i < index ? 100 : i === index ? Math.min(100, progressRef.current * 100) : 0}%` }}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close story"
            className="absolute right-2 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white/90 hover:bg-white/10"
          >
            ×
          </button>
          {paused && !busy && (
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
              Paused
            </div>
          )}

          {finished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center backdrop-blur-sm"
            >
              <div className="font-display text-3xl font-extrabold">That’s your {stats.yearLabel} ✨</div>
              <p className="max-w-xs text-sm text-white/75">Post your cards and tag your #1 person. Everything stayed on your device.</p>
              <button type="button" onClick={exportAll} className="mt-2 w-60 rounded-full bg-white px-5 py-3 font-bold text-black">
                {shareable ? 'Share all cards' : 'Save all cards (.zip)'}
              </button>
              <button type="button" onClick={restart} className="w-60 rounded-full border border-white/40 px-5 py-3 font-semibold">
                Replay
              </button>
              <button type="button" onClick={onClose} className="w-60 rounded-full px-5 py-2 text-sm text-white/70 underline">
                Change year or person
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {(busy || toast) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg"
            >
              {busy ?? toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="flex shrink-0 items-center justify-center gap-2 px-4"
        style={{ height: ACTION_BAR, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={exportCurrent}
          disabled={!!busy}
          className="flex h-12 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-full bg-white font-bold text-black active:scale-95 disabled:opacity-60"
        >
          <span aria-hidden>{shareable ? '↗' : '↓'}</span> {shareable ? 'Share card' : 'Download PNG'}
        </button>
        <button
          type="button"
          onClick={exportAll}
          disabled={!!busy}
          className="flex h-12 flex-1 max-w-[180px] items-center justify-center rounded-full border border-white/30 font-semibold text-white active:scale-95 disabled:opacity-60"
        >
          Save all
        </button>
      </div>
    </div>
  );
}
