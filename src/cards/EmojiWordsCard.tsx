import type { CardProps } from './types';
import { Big, Blob, CardFrame, Reveal, fmtNum, shortName } from './kit';

export function EmojiWordsCard({ stats, index, total }: CardProps) {
  const w = stats.words!;
  const [top, ...emojis] = w.topEmojis;
  const words = w.topWords.slice(0, top ? 7 : 10);
  const maxWord = words[0]?.count ?? 1;
  return (
    <CardFrame
      label="Your vocabulary"
      index={index}
      total={total}
      ink="#0b0b0b"
      background="linear-gradient(170deg, #d9ff3f 0%, #a3f75b 45%, #2ee6a6 100%)"
      decor={
        <>
          <Blob x={950} y={300} size={800} color="#fff7a8" opacity={0.7} />
          <Blob x={100} y={1700} size={900} color="#00c6a2" opacity={0.6} />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        {top ? (
          <>
            <Reveal delay={0.1}>
              <div style={{ fontSize: 50, fontWeight: 600 }}>Your most-used emoji</div>
            </Reveal>
            <div className="flex items-end" style={{ gap: 40, marginTop: 20 }}>
              <Reveal delay={0.3} scale={0.4} y={0}>
                <div className="emoji" style={{ fontSize: 300, lineHeight: 1.1 }}>
                  {top.emoji}
                </div>
              </Reveal>
              <Reveal delay={0.5}>
                <Big size={110}>×{fmtNum(top.count)}</Big>
                <div style={{ fontSize: 34, fontWeight: 600, marginTop: 12, opacity: 0.75 }}>
                  {fmtNum(w.totalEmojis)} emojis · {fmtNum(w.uniqueEmojis)} different
                </div>
              </Reveal>
            </div>
            {emojis.length > 0 && (
              <Reveal delay={0.75}>
                <div className="flex flex-wrap" style={{ gap: 18, marginTop: 34 }}>
                  {emojis.slice(0, 5).map((e, i) => (
                    <div key={e.emoji} className="flex items-center rounded-full" style={{ padding: '14px 28px 14px 20px', background: 'rgba(0,0,0,0.08)', gap: 14 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, opacity: 0.5 }}>{i + 2}</span>
                      <span className="emoji" style={{ fontSize: 72, lineHeight: 1 }}>
                        {e.emoji}
                      </span>
                      <span style={{ fontSize: 32, fontWeight: 700 }}>{fmtNum(e.count)}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </>
        ) : (
          <Reveal delay={0.1}>
            <Big size={120}>Zero emojis. Mysterious. 🗿</Big>
          </Reveal>
        )}

        {words.length > 0 && (
          <Reveal delay={1.05}>
            <div style={{ marginTop: 80, fontSize: 50, fontWeight: 600 }}>Words you couldn’t stop saying</div>
            <div className="flex flex-wrap items-baseline" style={{ gap: '14px 30px', marginTop: 26 }}>
              {words.map((wd, i) => {
                const k = wd.count / maxWord;
                return (
                  <span
                    key={wd.word}
                    className="font-display"
                    style={{ fontSize: Math.round(i === 0 ? 112 : 50 + 40 * k), fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, opacity: i < 3 ? 1 : 0.72 }}
                  >
                    {shortName(wd.word, 16)}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.65, marginTop: 24 }}>
              “{shortName(words[0]!.word, 16)}” × {fmtNum(words[0]!.count)} · avg {Math.round(w.avgWordsPerMessage * 10) / 10} words per message
            </div>
          </Reveal>
        )}
      </div>
    </CardFrame>
  );
}
