import type { CardProps } from './types';
import { Big, Blob, CardFrame, PAD, Reveal, CARD_W, compact, fitFont, shortName } from './kit';
import { hourLabel } from '../lib/format';

const PALETTES = {
  night: { bg: 'linear-gradient(160deg, #0b0322 0%, #2e0a5e 40%, #7a1fa2 70%, #ff4fa3 100%)', a: '#38bdf8', b: '#f472b6', c: '#a78bfa' },
  dawn: { bg: 'linear-gradient(160deg, #ff9a8b 0%, #ff6a88 40%, #ff99ac 70%, #ffd29d 100%)', a: '#fff1a8', b: '#ff4e8a', c: '#ffc0cb' },
  day: { bg: 'linear-gradient(160deg, #00c6ff 0%, #0072ff 45%, #7b2ff7 80%, #f107a3 100%)', a: '#a5f3fc', b: '#facc15', c: '#f0abfc' },
  dusk: { bg: 'linear-gradient(160deg, #1f0547 0%, #b4206d 45%, #ff7a3d 80%, #ffd25e 100%)', a: '#ffb347', b: '#ff5f6d', c: '#c084fc' },
} as const;

export function PersonalityCard({ stats, index, total }: CardProps) {
  const p = stats.personality!;
  const pal = PALETTES[p.palette];
  const [w1, ...restWords] = p.title.split(' ');
  const line1 = w1!;
  const line2 = restWords.join(' ');
  const width = CARD_W - PAD * 2;
  const size = Math.min(fitFont(line1, width, 180, 90, 0.6), fitFont(line2 || line1, width, 180, 90, 0.6));
  const summary = [
    stats.totals && { k: 'messages', v: compact(stats.totals.sent) },
    stats.people?.top[0] && { k: '#1 person', v: shortName(stats.people.top[0].name, 10) },
    stats.time && { k: 'peak hour', v: hourLabel(stats.time.peakHour) },
    stats.words?.topEmojis[0] && { k: 'top emoji', v: stats.words.topEmojis[0].emoji },
    !stats.totals && stats.instagram && { k: 'likes', v: compact(stats.instagram.likes) },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <CardFrame
      label={`${stats.yearLabel} personality`}
      index={index}
      total={total}
      background={pal.bg}
      footerNote="Make yours →"
      decor={
        <>
          <Blob x={180} y={380} size={900} color={pal.a} opacity={0.55} />
          <Blob x={950} y={900} size={900} color={pal.b} opacity={0.5} />
          <Blob x={300} y={1650} size={1000} color={pal.c} opacity={0.5} />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1} scale={0.3} y={0}>
          <div className="emoji" style={{ fontSize: 160, lineHeight: 1 }}>
            {p.emoji}
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ fontSize: 46, fontWeight: 600, marginTop: 20, opacity: 0.92 }}>You are a</div>
        </Reveal>
        <Reveal delay={0.45} y={90}>
          <Big size={size} style={{ marginTop: 14, textShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            {line1}
            {line2 && <br />}
            {line2}
          </Big>
        </Reveal>
        <Reveal delay={0.7}>
          <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.3, marginTop: 28, opacity: 0.95 }}>{p.tagline}</div>
        </Reveal>
        <div className="grid grid-cols-2" style={{ gap: 20, marginTop: 40 }}>
          {p.traits.map((t, i) => (
            <Reveal key={t.label} delay={0.95 + i * 0.12}>
              <div className="h-full rounded-[38px]" style={{ padding: '24px 28px', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)' }}>
                <div className="emoji" style={{ fontSize: 48, lineHeight: 1 }}>
                  {t.emoji}
                </div>
                <div className="font-display" style={{ fontSize: 40, fontWeight: 800, marginTop: 10, lineHeight: 1.05 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 25, fontWeight: 500, marginTop: 8, opacity: 0.88, lineHeight: 1.3 }}>{t.reason}</div>
              </div>
            </Reveal>
          ))}
        </div>
        {summary.length > 0 && (
          <Reveal delay={1.5}>
            <div className="flex justify-between rounded-[38px]" style={{ marginTop: 28, padding: '24px 36px', background: 'rgba(0,0,0,0.22)' }}>
              {summary.slice(0, 4).map((s) => (
                <div key={s.k} className="text-center">
                  <div className="font-display" style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>{s.k}</div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}
