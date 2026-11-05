import type { CardProps } from './types';
import { Big, Blob, CardFrame, CountUp, Reveal, compact, fmtNum, shortName } from './kit';

export function InstagramCard({ stats, index, total }: CardProps) {
  const ig = stats.instagram!;
  const tiles = [
    { emoji: '❤️', value: ig.likes, label: 'posts liked' },
    { emoji: '💬', value: ig.dmsSent, label: 'DMs sent' },
    { emoji: '🔖', value: ig.saved, label: 'posts saved' },
    { emoji: '👀', value: ig.stories, label: 'story reactions' },
    { emoji: '✍️', value: ig.comments, label: 'comments' },
    { emoji: '📥', value: ig.dmsReceived, label: 'DMs received' },
  ]
    .filter((t) => t.value > 0)
    .slice(0, 4);
  const hero = tiles[0]!;
  const people = ig.topAccounts.length ? ig.topAccounts.map((a) => ({ name: `@${a.account}`, total: a.total })) : ig.topDmPeople;
  return (
    <CardFrame
      label="Your Instagram"
      index={index}
      total={total}
      background="linear-gradient(200deg, #feda75 0%, #fa7e1e 25%, #d62976 55%, #962fbf 78%, #4f5bd5 100%)"
      decor={
        <>
          <Blob x={900} y={250} size={800} color="#ffe29a" opacity={0.6} />
          <Blob x={100} y={1600} size={900} color="#4f5bd5" opacity={0.6} />
          <div className="absolute rounded-[90px]" style={{ right: 80, top: 250, width: 240, height: 240, border: '20px solid rgba(255,255,255,0.18)' }} />
          <div className="absolute rounded-full" style={{ right: 150, top: 320, width: 100, height: 100, border: '18px solid rgba(255,255,255,0.18)' }} />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1}>
          <div style={{ fontSize: 50, fontWeight: 600 }}>On the gram you racked up</div>
        </Reveal>
        <Reveal delay={0.3} y={80}>
          <Big size={hero.value >= 100_000 ? 250 : 300} style={{ marginTop: 16 }}>
            <CountUp value={hero.value} />
          </Big>
          <Big size={96}>{hero.label}</Big>
        </Reveal>
        {tiles.length > 1 && (
          <Reveal delay={0.6}>
            <div className="grid grid-cols-3" style={{ gap: 22, marginTop: 56 }}>
              {tiles.slice(1).map((t) => (
                <div key={t.label} className="rounded-[36px]" style={{ padding: '30px 28px', background: 'rgba(255,255,255,0.2)' }}>
                  <div className="emoji" style={{ fontSize: 52 }}>
                    {t.emoji}
                  </div>
                  <div className="font-display" style={{ fontSize: 66, fontWeight: 800, lineHeight: 1, marginTop: 8 }}>
                    {compact(t.value)}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.88, marginTop: 6 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
        {people.length > 0 && (
          <Reveal delay={0.95}>
            <div style={{ marginTop: 64, fontSize: 40, fontWeight: 700 }}>
              {ig.topAccounts.length ? 'Accounts you interact with most' : 'Your top DMs'}
            </div>
            <div style={{ marginTop: 20 }}>
              {people.slice(0, 5).map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between"
                  style={{ padding: '20px 0', borderBottom: i < Math.min(people.length, 5) - 1 ? '2px solid rgba(255,255,255,0.25)' : 'none', fontSize: 42, fontWeight: 700 }}
                >
                  <span>
                    <span style={{ opacity: 0.6, marginRight: 22 }}>{i + 1}</span>
                    {shortName(p.name, 22)}
                  </span>
                  <span style={{ fontWeight: 600, opacity: 0.85, fontSize: 36 }}>{fmtNum(p.total)}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}
