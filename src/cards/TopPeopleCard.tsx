import type { CardProps } from './types';
import { Big, Blob, CardFrame, PAD, Reveal, CARD_W, fitFont, fmtNum, shortName } from './kit';

export function TopPeopleCard({ stats, index, total }: CardProps) {
  const p = stats.people!;
  const [first, ...rest] = p.top;
  const name = shortName(first!.name, 18);
  const max = first!.total;
  return (
    <CardFrame
      label="Your #1 person"
      index={index}
      total={total}
      background="linear-gradient(165deg, #1e0a5c 0%, #5b21b6 48%, #0ea5e9 100%)"
      decor={
        <>
          <Blob x={900} y={420} size={900} color="#f0abfc" opacity={0.45} />
          <Blob x={150} y={1650} size={900} color="#22d3ee" opacity={0.5} />
          <div className="absolute font-display" style={{ left: PAD - 20, top: 210, fontSize: 520, fontWeight: 800, opacity: 0.1, lineHeight: 1 }}>
            #1
          </div>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={0.1}>
          <div style={{ fontSize: 50, fontWeight: 600, opacity: 0.9 }}>
            {p.fromGroups ? 'Loudest voice in your groups' : 'The one you couldn’t stop texting'}
          </div>
        </Reveal>
        <Reveal delay={0.3} y={80}>
          <Big size={fitFont(name, CARD_W - PAD * 2, 190, 90)} style={{ marginTop: 26, wordBreak: 'break-word' }}>
            {name}
          </Big>
        </Reveal>
        <Reveal delay={0.55}>
          <div style={{ fontSize: 46, fontWeight: 700, marginTop: 30 }}>
            💬 {fmtNum(first!.total)} messages {p.fromGroups ? 'in your groups' : 'between you two'}
          </div>
          {!p.fromGroups && (
            <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.82, marginTop: 12 }}>
              you sent {fmtNum(first!.sent)} · they sent {fmtNum(first!.received)}
            </div>
          )}
        </Reveal>
        {rest.length > 0 && (
          <div style={{ marginTop: 84 }}>
            {rest.map((person, i) => (
              <Reveal key={person.name} delay={0.85 + i * 0.12}>
                <div className="relative overflow-hidden rounded-[30px]" style={{ height: 104, marginBottom: 18, background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-[30px]"
                    style={{ width: `${Math.max(18, (person.total / max) * 100)}%`, background: 'rgba(255,255,255,0.2)' }}
                  />
                  <div className="relative flex h-full items-center justify-between" style={{ padding: '0 36px', fontSize: 40, fontWeight: 700 }}>
                    <span>
                      <span style={{ opacity: 0.65, marginRight: 22 }}>{i + 2}</span>
                      {shortName(person.name, 20)}
                    </span>
                    <span style={{ fontWeight: 600, opacity: 0.9 }}>{fmtNum(person.total)}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
        {p.topGroup && !p.fromGroups && (
          <Reveal delay={1.5}>
            <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.85, marginTop: 20 }}>
              👥 Top group: {shortName(p.topGroup.title, 26)} ({fmtNum(p.topGroup.total)} msgs)
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}
