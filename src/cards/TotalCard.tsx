import type { CardProps } from './types';
import { Big, Blob, CardFrame, CountUp, PAD, Reveal, CARD_W, fitFont, fmtNum } from './kit';
import { isoToNice } from '../lib/format';

export function TotalCard({ stats, index, total }: CardProps) {
  const t = stats.totals!;
  const num = fmtNum(t.sent);
  const size = fitFont(num, CARD_W - PAD * 2, 300, 120, 0.6);
  const platforms = Object.entries(t.byPlatform);
  return (
    <CardFrame
      label={stats.year === 'all' ? 'All time' : `Your ${stats.yearLabel}`}
      index={index}
      total={total}
      background="linear-gradient(160deg, #ff1f5a 0%, #ff5e3a 45%, #ffb21f 100%)"
      decor={
        <>
          <Blob x={980} y={260} size={900} color="#ffe14d" opacity={0.55} />
          <Blob x={60} y={1500} size={1000} color="#c3005a" opacity={0.6} />
          <svg className="absolute" style={{ right: -90, bottom: 300, opacity: 0.1 }} width="620" height="560" viewBox="0 0 62 56" aria-hidden>
            <path d="M8 2h46a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H26L12 54V42H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" fill="#fff" />
          </svg>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1}>
          <div style={{ fontSize: 56, fontWeight: 600, opacity: 0.92 }}>{stats.year === 'all' ? 'All in all, you sent' : `In ${stats.year} you sent`}</div>
        </Reveal>
        <Reveal delay={0.25} y={80}>
          <Big size={size} style={{ marginTop: 24 }}>
            <CountUp value={t.sent} />
          </Big>
        </Reveal>
        <Reveal delay={0.4}>
          <Big size={110} style={{ marginTop: 8 }}>
            messages
          </Big>
        </Reveal>
        <Reveal delay={0.9}>
          <div
            className="rounded-[48px]"
            style={{ marginTop: 80, padding: '44px 48px', background: 'rgba(40, 0, 20, 0.22)', fontSize: 50, fontWeight: 700, lineHeight: 1.2 }}
          >
            📚 {t.comparison.blurb}.
            <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.85, marginTop: 14 }}>
              {fmtNum(t.wordsSent)} words · {typing(t.typingHours)} of typing
            </div>
          </div>
        </Reveal>
        <Reveal delay={1.15}>
          <div className="grid grid-cols-3" style={{ marginTop: 44, gap: 24 }}>
            <Mini value={fmtNum(t.received)} label="received" />
            <Mini value={fmtNum(Math.round(t.perActiveDay))} label="per day" />
            {t.changePct !== null ? (
              <Mini value={`${t.changePct > 0 ? '+' : ''}${t.changePct}%`} label={`vs ${Number(stats.year) - 1}`} />
            ) : (
              <Mini value={fmtNum(t.activeDays)} label="active days" />
            )}
          </div>
        </Reveal>
        {(t.busiestDay || platforms.length > 1) && (
          <Reveal delay={1.35}>
            <div style={{ marginTop: 40, fontSize: 36, fontWeight: 600, opacity: 0.9 }}>
              {t.busiestDay && (
                <div>
                  🔥 Busiest day: {isoToNice(t.busiestDay.date)} — {fmtNum(t.busiestDay.count)} messages
                </div>
              )}
              {platforms.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  {platforms.map(([p, v]) => `${p === 'whatsapp' ? 'WhatsApp' : 'Instagram'} ${fmtNum(v!.sent)}`).join('  ·  ')}
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[36px]" style={{ padding: '30px 28px', background: 'rgba(255,255,255,0.18)' }}>
      <div className="font-display" style={{ fontSize: 62, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.85, marginTop: 8 }}>{label}</div>
    </div>
  );
}

function typing(hours: number): string {
  if (hours < 1) return `≈${Math.max(1, Math.round(hours * 60))} min`;
  const h = Math.round(hours);
  return `≈${fmtNum(h)} ${h === 1 ? 'hour' : 'hours'}`;
}
