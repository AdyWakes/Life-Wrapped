import { useCallback, useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { Parsing } from './components/Parsing';
import { Setup } from './components/Setup';
import { Story } from './components/Story';
import { ParserClient } from './workers/client';
import { buildCards } from './cards/registry';
import type { CardDef } from './cards/types';
import type { DatasetSummary } from './types';
import type { WrappedStats } from './stats/types';

type View =
  | { name: 'landing'; error?: string | null }
  | { name: 'parsing'; fraction: number; label: string }
  | { name: 'setup' }
  | { name: 'story' };

export default function App() {
  const client = useRef<ParserClient | null>(null);
  const [view, setView] = useState<View>({ name: 'landing' });
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ me: string[]; year: number | 'all' } | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const getClient = () => (client.current ??= new ParserClient());
  useEffect(() => () => client.current?.terminate(), []);

  const play = useCallback(async (me: string[], year: number | 'all', sum?: DatasetSummary) => {
    setBusy(true);
    setNotice(null);
    setChoice({ me, year });
    try {
      const s = await getClient().compute({ me, year });
      const c = buildCards(s);
      if (!c.length) {
        setNotice(`Not enough data for ${year === 'all' ? 'all time' : year} with that name selected. Try another year or name.`);
        setView({ name: 'setup' });
        return;
      }
      setStats(s);
      setCards(c);
      setView({ name: 'story' });
    } catch (err) {
      setNotice(`Something went wrong: ${err instanceof Error ? err.message : String(err)}`);
      if (sum) setView({ name: 'setup' });
    } finally {
      setBusy(false);
    }
  }, []);

  const load = useCallback(
    async (kind: 'files' | 'demo', files?: File[]) => {
      // Fresh worker per load so old data is dropped from memory.
      client.current?.terminate();
      client.current = null;
      setStats(null);
      setChoice(null);
      setNotice(null);
      setIsDemo(kind === 'demo');
      setView({ name: 'parsing', fraction: 0, label: kind === 'demo' ? 'Generating sample data' : 'Reading files' });
      const onProgress = (fraction: number, label: string) => setView({ name: 'parsing', fraction, label });
      try {
        const sum = kind === 'demo' ? await getClient().demo(onProgress) : await getClient().parse(files!, onProgress);
        setSummary(sum);
        if (kind === 'demo') {
          await play(sum.suggestedMe, sum.defaultYear, sum);
          return;
        }
        setView({ name: 'setup' });
      } catch (err) {
        setView({ name: 'landing', error: `Couldn’t read those files: ${err instanceof Error ? err.message : String(err)}` });
      }
    },
    [play],
  );

  const reset = () => {
    client.current?.terminate();
    client.current = null;
    setSummary(null);
    setStats(null);
    setView({ name: 'landing' });
  };

  if (view.name === 'parsing') return <Parsing fraction={view.fraction} label={view.label} />;

  if (view.name === 'story' && stats && cards.length) {
    return <Story cards={cards} stats={stats} onClose={() => (isDemo ? reset() : setView({ name: 'setup' }))} />;
  }

  if ((view.name === 'setup' || view.name === 'story') && summary) {
    return (
      <Setup
        key={summary.messageCount + ':' + summary.chatCount}
        summary={summary}
        busy={busy}
        notice={notice}
        initialMe={choice?.me}
        initialYear={choice?.year}
        onPlay={(me, year) => play(me, year, summary)}
        onBack={reset}
      />
    );
  }

  return <Landing onFiles={(f) => load('files', f)} onDemo={() => load('demo')} error={view.name === 'landing' ? view.error : null} />;
}
