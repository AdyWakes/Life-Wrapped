import type { CardProps } from './types';
import { Big, Blob, CardFrame, CountUp, PAD, Reveal, CARD_W, fitFont, shortName } from './kit';
import { isoToNice } from '../lib/format';

export function StreakCard({ stats, index, total }: CardProps) {
  const s = stats.streak!;
  const name = shortName(s.name, 18);
  const dots = Math.min(s.days, 60);
  return (
    <CardFrame
      label="Longest streak"
      index={index}
      total={total}
      background="linear-gradient(165deg, #2b0300 0%, #b91c1c 42%, #ff7a00 80%, #ffd000 100%)"
      decor={
        <>
          <Blob x={540} y={1650} size={1300} color="#ffde59" opacity={0.6} />
          <Blob x={900} y={300} size={700} color="#ff3d00" opacity={0.5} />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1} scale={0.5} y={0}>
          <div className="emoji" style={{ fontSize: 200, lineHeight: 1 }}>
            🔥
          </div>
        </Reveal>
        <Reveal delay={0.3} y={80}>
          <Big size={s.days >= 100 ? 380 : 420} style={{ marginTop: 20 }}>
            <CountUp value={s.days} />
          </Big>
        </Reveal>
        <Reveal delay={0.45}>
          <Big size={110}>days in a row</Big>
        </Reveal>
        <Reveal delay={0.7}>
          <div style={{ fontSize: 46, fontWeight: 600, marginTop: 40, lineHeight: 1.25 }}>
            You and{' '}
            <span className="font-display" style={{ fontSize: fitFont(name, CARD_W - PAD * 2, 80, 50), fontWeight: 800 }}>
              {name}
            </span>{' '}
            texted every single day.
          </div>
          <div style={{ fontSize: 36, fontWeight: 500, opacity: 0.85, marginTop: 16 }}>
            {isoToNice(s.start)} → {isoToNice(s.end)}
          </div>
        </Reveal>
        <Reveal delay={0.95}>
          <div className="flex flex-wrap" style={{ gap: 10, marginTop: 50 }}>
            {Array.from({ length: dots }, (_, i) => (
              <div key={i} className="rounded-full" style={{ width: 34, height: 34, background: '#fff', opacity: 0.35 + 0.65 * ((i + 1) / dots) }} />
            ))}
            {s.days > dots && <div style={{ fontSize: 30, fontWeight: 700, alignSelf: 'center', marginLeft: 8 }}>+{s.days - dots}</div>}
          </div>
        </Reveal>
        {s.runnersUp.length > 0 && (
          <Reveal delay={1.2}>
            <div style={{ marginTop: 50, fontSize: 34, fontWeight: 600, opacity: 0.9 }}>
              Runners-up: {s.runnersUp.map((r) => `${shortName(r.name, 14)} (${r.days}d)`).join(' · ')}
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}
