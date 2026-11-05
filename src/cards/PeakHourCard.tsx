import type { CardProps } from './types';
import { Big, Blob, CardFrame, CountUp, PAD, Reveal, CARD_W, fmtNum, shortName, useCardMode } from './kit';
import { DAY_NAMES, hourLabel } from '../lib/format';
import { motion } from 'framer-motion';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function PeakHourCard({ stats, index, total }: CardProps) {
  const t = stats.time!;
  const mode = useCardMode();
  const max = Math.max(1, ...t.heatmap.flat());
  const gridW = CARD_W - PAD * 2 - 56;
  const gap = 5;
  const cell = (gridW - gap * 23) / 24;
  const pct = Math.round(t.lateNightPct * 100);
  return (
    <CardFrame
      label="Your clock"
      index={index}
      total={total}
      background="linear-gradient(180deg, #030521 0%, #1a0b4b 55%, #4c0b5e 100%)"
      decor={
        <>
          <Blob x={860} y={330} size={700} color="#7c3aed" opacity={0.55} />
          <Blob x={200} y={1700} size={800} color="#db2777" opacity={0.35} />
          <div className="absolute rounded-full" style={{ right: 110, top: 300, width: 170, height: 170, background: '#fde68a', boxShadow: '0 0 120px 30px rgba(253,230,138,0.35)' }} />
          <div className="absolute rounded-full" style={{ right: 70, top: 270, width: 170, height: 170, background: '#120a3a' }} />
          {STARS.map(([x, y, s], i) => (
            <div key={i} className="absolute rounded-full" style={{ left: x, top: y, width: s, height: s, background: '#fff', opacity: 0.7 }} />
          ))}
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1}>
          <div style={{ fontSize: 50, fontWeight: 600, opacity: 0.9 }}>You texted the most at</div>
        </Reveal>
        <Reveal delay={0.3} y={80}>
          <Big size={300} style={{ marginTop: 10, color: '#fde68a' }}>
            {hourLabel(t.peakHour)}
          </Big>
        </Reveal>
        <Reveal delay={0.45}>
          <div style={{ fontSize: 44, fontWeight: 600, marginTop: 6 }}>
            and on <b>{DAY_NAMES[t.peakDay]}s</b> more than any other day
          </div>
        </Reveal>

        <Reveal delay={0.7}>
          <div style={{ marginTop: 70 }}>
            {t.heatmap.map((row, d) => (
              <div key={d} className="flex items-center" style={{ marginBottom: gap }}>
                <div style={{ width: 56, fontSize: 26, fontWeight: 700, opacity: 0.6 }}>{DAYS[d]}</div>
                <div className="flex" style={{ gap }}>
                  {row.map((v, h) => {
                    const k = v / max;
                    const style = {
                      width: cell,
                      height: cell,
                      borderRadius: 9,
                      background: k === 0 ? 'rgba(255,255,255,0.07)' : heat(k),
                    };
                    return mode === 'export' ? (
                      <div key={h} style={style} />
                    ) : (
                      <motion.div
                        key={h}
                        style={style}
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + h * 0.025 + d * 0.03, duration: 0.4 }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex justify-between" style={{ marginLeft: 56, fontSize: 24, fontWeight: 600, opacity: 0.55, marginTop: 10 }}>
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>11pm</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={1.4}>
          <div className="rounded-[44px]" style={{ marginTop: 64, padding: '40px 46px', background: 'rgba(253,230,138,0.12)', border: '3px solid rgba(253,230,138,0.5)' }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 3, color: '#fde68a' }}>🌙 THE 3AM CLUB</div>
            <div className="font-display" style={{ fontSize: 76, fontWeight: 800, marginTop: 10, lineHeight: 1.05 }}>
              <CountUp value={t.lateNight} delay={1.4} /> messages after midnight
            </div>
            <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.85, marginTop: 12 }}>
              {pct > 0 ? `${pct}% of everything you sent` : 'You actually sleep. Respect.'}
              {t.threeAm > 0 && ` · ${fmtNum(t.threeAm)} between 3 and 4am`}
              {t.lateNightPerson && ` · mostly with ${shortName(t.lateNightPerson.name, 16)}`}
            </div>
          </div>
        </Reveal>
      </div>
    </CardFrame>
  );
}

function heat(k: number): string {
  // indigo -> pink -> amber
  const stops = [
    [99, 102, 241],
    [236, 72, 153],
    [253, 230, 138],
  ] as const;
  const x = Math.min(1, Math.max(0, Math.sqrt(k)));
  const seg = x < 0.5 ? 0 : 1;
  const local = seg === 0 ? x / 0.5 : (x - 0.5) / 0.5;
  const a = stops[seg]!;
  const b = stops[seg + 1]!;
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * local));
  return `rgba(${c[0]},${c[1]},${c[2]},${0.35 + 0.65 * x})`;
}

const STARS: [number, number, number][] = [
  [140, 300, 6], [320, 250, 4], [520, 330, 5], [700, 230, 4], [960, 520, 6], [610, 470, 3], [250, 470, 4], [880, 180, 5],
];
