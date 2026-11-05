import type { CardProps } from './types';
import { Big, Blob, CardFrame, Reveal, shortName } from './kit';
import { durationParts, durationShort } from '../lib/format';

export function ReplyCard({ stats, index, total }: CardProps) {
  const r = stats.replies!;
  const mine = r.myMedianMs !== null ? durationParts(r.myMedianMs) : null;
  return (
    <CardFrame
      label="Reply speed"
      index={index}
      total={total}
      background="linear-gradient(170deg, #001b1f 0%, #035e63 45%, #10b39a 80%, #9ef01a 100%)"
      decor={
        <>
          <Blob x={880} y={360} size={800} color="#5eead4" opacity={0.4} />
          <Blob x={150} y={1700} size={900} color="#bef264" opacity={0.45} />
          <div className="absolute rounded-full" style={{ right: 90, top: 260, width: 300, height: 300, border: '14px solid rgba(255,255,255,0.12)' }} />
          <div className="absolute" style={{ right: 235, top: 300, width: 14, height: 120, borderRadius: 7, background: 'rgba(255,255,255,0.2)' }} />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        {mine && (
          <>
            <Reveal delay={0.1}>
              <div style={{ fontSize: 50, fontWeight: 600, opacity: 0.9 }}>You usually reply in</div>
            </Reveal>
            <Reveal delay={0.3} y={80}>
              <div className="flex items-baseline" style={{ gap: 26, marginTop: 10 }}>
                <Big size={300}>{mine.value}</Big>
                <Big size={110}>{mine.unit}</Big>
              </div>
            </Reveal>
            <Reveal delay={0.45}>
              <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.85 }}>{verdict(r.myMedianMs!)}</div>
            </Reveal>
          </>
        )}
        <div className="flex flex-col" style={{ gap: 26, marginTop: 70 }}>
          {r.fastest && (
            <Reveal delay={0.75}>
              <Row emoji="⚡" title="Fastest replier" name={r.fastest.name} value={durationShort(r.fastest.theirMedianMs!)} bg="rgba(190,242,100,0.22)" />
            </Reveal>
          )}
          {r.slowest && r.slowest.name !== r.fastest?.name && (
            <Reveal delay={0.95}>
              <Row emoji="🫥" title="Leaves you on seen" name={r.slowest.name} value={durationShort(r.slowest.theirMedianMs!)} bg="rgba(0,0,0,0.25)" />
            </Reveal>
          )}
          {r.youLeaveOnSeen && (
            <Reveal delay={1.15}>
              <Row emoji="🙈" title="You leave on seen" name={r.youLeaveOnSeen.name} value={durationShort(r.youLeaveOnSeen.myMedianMs!)} bg="rgba(255,255,255,0.12)" />
            </Reveal>
          )}
        </div>
      </div>
    </CardFrame>
  );
}

function Row({ emoji, title, name, value, bg }: { emoji: string; title: string; name: string; value: string; bg: string }) {
  return (
    <div className="flex items-center rounded-[40px]" style={{ padding: '34px 40px', background: bg, gap: 30 }}>
      <div className="emoji" style={{ fontSize: 84, lineHeight: 1 }}>
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, opacity: 0.75, textTransform: 'uppercase' }}>{title}</div>
        <div className="font-display" style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.05, marginTop: 6 }}>
          {shortName(name, 18)}
        </div>
      </div>
      <div className="font-display" style={{ fontSize: 56, fontWeight: 800, whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}

function verdict(ms: number): string {
  if (ms < 60_000) return 'Basically telepathic. ⚡';
  if (ms < 5 * 60_000) return 'Phone permanently in hand.';
  if (ms < 30 * 60_000) return 'Responsive, but with boundaries.';
  if (ms < 3 * 3_600_000) return 'You like to make them wait. 😌';
  return 'Professional ghost. 👻';
}
