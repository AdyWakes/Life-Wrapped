import { useMemo, useState } from 'react';
import type { DatasetSummary } from '../types';
import { PrivacyBadge } from './PrivacyBadge';

interface Props {
  summary: DatasetSummary;
  busy: boolean;
  notice: string | null;
  initialMe?: string[];
  initialYear?: number | 'all';
  onPlay: (me: string[], year: number | 'all') => void;
  onBack: () => void;
}

const nf = new Intl.NumberFormat();

export function Setup({ summary, busy, notice, initialMe, initialYear, onPlay, onBack }: Props) {
  const [me, setMe] = useState<string[]>(initialMe ?? summary.suggestedMe);
  const [year, setYear] = useState<number | 'all'>(initialYear ?? summary.defaultYear);
  const [query, setQuery] = useState('');
  const [showWarnings, setShowWarnings] = useState(false);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? summary.participants.filter((p) => p.name.toLowerCase().includes(q)) : summary.participants;
    // Selected people always stay visible.
    const top = list.slice(0, q ? 30 : 10);
    for (const name of me) if (!top.some((p) => p.name === name)) {
      const p = summary.participants.find((x) => x.name === name);
      if (p) top.unshift(p);
    }
    return top;
  }, [summary.participants, query, me]);

  const toggle = (name: string) => setMe((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  const found = [
    summary.whatsappChats && `${summary.whatsappChats} WhatsApp chat${summary.whatsappChats === 1 ? '' : 's'}`,
    summary.instagramThreads && `${summary.instagramThreads} Instagram DM thread${summary.instagramThreads === 1 ? '' : 's'}`,
    summary.instagramSources.filter((s) => s !== 'messages').length > 0 && `Instagram ${summary.instagramSources.filter((s) => s !== 'messages').join(', ')}`,
  ].filter(Boolean);

  const nothing = summary.messageCount === 0 && summary.instagramSources.length === 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-4 pb-10 pt-6 sm:pt-10">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
          ← Start over
        </button>
        <div className="font-display text-xl font-extrabold">lifewrapped</div>
      </div>

      <h1 className="mt-8 font-display text-4xl font-extrabold leading-tight">
        {nothing ? 'Hmm, nothing to wrap' : 'Found it.'}
      </h1>
      <p className="mt-2 text-white/75">
        {nothing
          ? 'We couldn’t find any WhatsApp chats or Instagram JSON in those files.'
          : `${found.join(' · ')} — ${nf.format(summary.messageCount)} messages in total.`}
      </p>

      {summary.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100">
          <button type="button" className="font-semibold" onClick={() => setShowWarnings((v) => !v)}>
            ⚠️ {summary.warnings.length} file{summary.warnings.length === 1 ? '' : 's'} skipped {showWarnings ? '▴' : '▾'}
          </button>
          {showWarnings && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/80">
              {summary.warnings.slice(0, 20).map((w, i) => (
                <li key={i} className="break-words">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!nothing && (
        <>
          {summary.participants.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-extrabold">Which one is you?</h2>
              <p className="mt-1 text-sm text-white/60">
                We guessed from your chats. Pick every name you go by (e.g. your WhatsApp and Instagram names).
              </p>
              {summary.participants.length > 10 && (
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search names…"
                  className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-base outline-none placeholder:text-white/40 focus:bg-white/15"
                />
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((p) => {
                  const on = me.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => toggle(p.name)}
                      aria-pressed={on}
                      className={`max-w-full truncate rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                        on ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {p.name}
                      <span className={`ml-1.5 text-xs ${on ? 'text-black/50' : 'text-white/45'}`}>
                        {p.platforms.map((x) => (x === 'whatsapp' ? 'WA' : 'IG')).join('+')} · {p.chatCount} chat{p.chatCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-2xl font-extrabold">Which year?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.years.map((y) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => setYear(y.year)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${year === y.year ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {y.year}
                  <span className={`ml-1.5 text-xs ${year === y.year ? 'text-black/50' : 'text-white/45'}`}>{nf.format(y.count)}</span>
                </button>
              ))}
              {summary.years.length > 1 && (
                <button
                  type="button"
                  onClick={() => setYear('all')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${year === 'all' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  All time
                </button>
              )}
            </div>
          </section>

          {notice && <div className="mt-6 rounded-2xl bg-white/10 p-3 text-sm text-white/85">{notice}</div>}

          <div className="sticky bottom-0 mt-auto pt-8" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              disabled={busy || (summary.participants.length > 0 && me.length === 0)}
              onClick={() => onPlay(me, year)}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300 px-6 py-4 text-lg font-extrabold text-black shadow-[0_10px_40px_-10px_rgba(255,46,99,0.8)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? 'Crunching numbers…' : me.length === 0 && summary.participants.length > 0 ? 'Pick your name first' : '▶ Play my Wrapped'}
            </button>
            <div className="mt-4 flex justify-center">
              <PrivacyBadge />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
