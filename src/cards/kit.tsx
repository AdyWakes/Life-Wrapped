import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { APP_NAME, REPO_SHORT } from '../lib/config';

/** Cards are designed on a fixed 1080×1920 canvas: the story scales it, the PNG export renders it 1:1. */
export const CARD_W = 1080;
export const CARD_H = 1920;
export const PAD = 88;

export type CardMode = 'live' | 'export';
export const CardModeContext = createContext<CardMode>('live');
export const useCardMode = () => useContext(CardModeContext);

export interface CardFrameProps {
  background: string;
  /** Text colour for the whole card. */
  ink?: string;
  label: string;
  index: number;
  total: number;
  decor?: ReactNode;
  children: ReactNode;
  footerNote?: string;
}

export function CardFrame({ background, ink = '#fff', label, index, total, decor, children, footerNote }: CardFrameProps) {
  return (
    <div
      className="relative overflow-hidden font-sans"
      style={{ width: CARD_W, height: CARD_H, background, color: ink }}
      data-card-root
    >
      {decor}
      <div className="absolute inset-0 flex flex-col" style={{ padding: `170px ${PAD}px 190px` }}>
        <div className="flex items-center justify-between" style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
          <span
            className="rounded-full uppercase"
            style={{ padding: '12px 26px', border: `3px solid currentColor`, opacity: 0.9 }}
          >
            {label}
          </span>
          <span style={{ opacity: 0.7 }}>
            {String(index).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
        </div>
        <FitBox>{children}</FitBox>
      </div>
      <Watermark note={footerNote} />
    </div>
  );
}

/** Shrinks its content uniformly if it would overflow (long names, lots of data) — never clips. */
function FitBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const avail = o.clientHeight;
      const need = i.scrollHeight;
      const next = need > avail + 1 ? Math.max(0.6, avail / need) : 1;
      setK((cur) => (Math.abs(cur - next) > 0.01 ? next : cur));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative min-h-0 flex-1">
      <div
        ref={inner}
        className="absolute left-0 top-0 flex flex-col"
        style={{
          // Width stays fixed so the layout (and therefore the measurement) doesn't depend on k.
          width: '100%',
          minHeight: `${100 / k}%`,
          transform: k === 1 ? undefined : `scale(${k})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Watermark({ note }: { note?: string }) {
  return (
    <div
      className="absolute flex items-end justify-between"
      style={{ left: PAD, right: PAD, bottom: 70, fontSize: 28, opacity: 0.78 }}
    >
      <div className="flex items-center" style={{ gap: 14 }}>
        <LogoMark size={44} />
        <span className="font-display" style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>
          {APP_NAME}
        </span>
      </div>
      <div className="text-right" style={{ lineHeight: 1.3 }}>
        {note && <div style={{ fontWeight: 700 }}>{note}</div>}
        <div style={{ fontWeight: 500 }}>{REPO_SHORT}</div>
      </div>
    </div>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="currentColor" opacity="0.18" />
      <path d="M20 16v32h24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="44" cy="22" r="5" fill="currentColor" />
    </svg>
  );
}

/** Fade/slide in when live; render the final state immediately when exporting. */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
  style,
  scale,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
  scale?: number;
}) {
  const mode = useCardMode();
  if (mode === 'export') {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, scale: scale ?? 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Animated number that counts up when live. */
export function CountUp({ value, duration = 1.6, delay = 0.2, format = fmtNum }: { value: number; duration?: number; delay?: number; format?: (n: number) => string }) {
  const mode = useCardMode();
  const [shown, setShown] = useState(mode === 'export' ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (mode === 'export') {
      setShown(value);
      return;
    }
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, delay, mode]);
  const isInt = Number.isInteger(value);
  return <>{format(isInt ? Math.round(shown) : Math.round(shown * 10) / 10)}</>;
}

const nf = new Intl.NumberFormat();
export const fmtNum = (n: number) => nf.format(n);

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return fmtNum(n);
}

/**
 * Pick a font size so `text` fits in `width` px on one line (approximate: display font ≈ 0.56em per char;
 * wide chars like emoji/CJK count double).
 */
export function fitFont(text: string, width: number, max: number, min = 40, perChar = 0.56): number {
  let units = 0;
  for (const ch of text) units += /[ᄀ-￿]/.test(ch) && !/[ऀ-ॿ]/.test(ch) ? 1.6 : 1;
  const size = width / Math.max(1, units * perChar);
  return Math.max(min, Math.min(max, Math.floor(size)));
}

/** Soft blurred blob made of a radial gradient (no CSS filters, so it exports identically everywhere). */
export function Blob({ x, y, size, color, opacity = 1 }: { x: number; y: number; size: number; color: string; opacity?: number }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        opacity,
        background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
      }}
    />
  );
}

export function Big({ children, size, className, style }: { children: ReactNode; size: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={`font-display ${className ?? ''}`} style={{ fontSize: size, fontWeight: 800, lineHeight: 0.92, letterSpacing: -size * 0.035, ...style }}>
      {children}
    </div>
  );
}

export function shortName(name: string, max = 22): string {
  const chars = [...name];
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : name;
}
