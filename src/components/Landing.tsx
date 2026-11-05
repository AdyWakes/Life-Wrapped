import { motion } from 'framer-motion';
import { DropZone } from './DropZone';
import { HowToExport } from './HowToExport';
import { PrivacyBadge } from './PrivacyBadge';
import { REPO_URL } from '../lib/config';

interface Props {
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  error?: string | null;
}

const PREVIEW = [
  { bg: 'linear-gradient(160deg,#ff1f5a,#ff5e3a 45%,#ffb21f)', big: '48,210', small: 'messages sent', rot: -8 },
  { bg: 'linear-gradient(165deg,#1e0a5c,#5b21b6 48%,#0ea5e9)', big: 'Priya', small: 'your #1 person', rot: 0 },
  { bg: 'linear-gradient(160deg,#0b0322,#2e0a5e 40%,#7a1fa2 70%,#ff4fa3)', big: 'Night Owl Yapper', small: '🦉 your personality', rot: 8 },
];

export function Landing({ onFiles, onDemo, error }: Props) {
  const year = new Date().getFullYear();
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60" style={{ background: 'radial-gradient(circle, #ff2e63 0%, transparent 65%)' }} />
        <div className="absolute -right-40 top-40 h-[560px] w-[560px] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #ffb21f 0%, transparent 65%)' }} />
      </div>

      <main className="relative mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:flex-row lg:items-start lg:gap-14">
        <section className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-display text-2xl font-extrabold tracking-tight">lifewrapped</div>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              ★ Star on GitHub
            </a>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-10 font-display text-[44px] font-extrabold leading-[0.95] tracking-tight sm:text-7xl"
          >
            Your {year} in chats,{' '}
            <span className="bg-gradient-to-r from-pink-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">wrapped.</span>
          </motion.h1>
          <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
            Drop your WhatsApp or Instagram export. Get a story of who you texted, when, and how — ready to post.
          </p>

          <div className="mt-5">
            <PrivacyBadge />
          </div>

          <div className="mt-7 flex flex-col gap-4">
            <button
              type="button"
              onClick={onDemo}
              className="group relative w-full overflow-hidden rounded-full bg-white px-6 py-4 text-lg font-extrabold text-black shadow-[0_10px_40px_-10px_rgba(255,46,99,0.7)] transition active:scale-[0.98] sm:w-auto sm:self-start"
            >
              ✨ Try with sample data
            </button>
            <DropZone onFiles={onFiles} />
            {error && <div className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</div>}
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-white/70 sm:grid-cols-2">
            <li>⚡ Parsed in a Web Worker — 200k+ messages, no freeze</li>
            <li>🔒 Strict CSP: the page can’t send data anywhere</li>
            <li>📱 1080×1920 PNGs, made for Stories</li>
            <li>🧑‍💻 Open source, no accounts, no analytics</li>
          </ul>
        </section>

        <section className="flex w-full flex-col gap-6 lg:w-[400px]">
          <div className="relative mx-auto hidden h-[300px] w-full max-w-[380px] sm:block" aria-hidden>
            {PREVIEW.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: p.rot }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 flex h-[280px] w-[158px] flex-col justify-end rounded-2xl p-3 shadow-2xl"
                style={{ left: `${i * 110}px`, background: p.bg, zIndex: i === 1 ? 2 : 1 }}
              >
                <div className="font-display text-2xl font-extrabold leading-none">{p.big}</div>
                <div className="mt-1 text-[11px] font-semibold opacity-85">{p.small}</div>
                <div className="mt-3 text-[8px] font-bold opacity-70">lifewrapped</div>
              </motion.div>
            ))}
          </div>
          <HowToExport />
          <div className="rounded-3xl bg-white/5 p-5 text-sm text-white/70">
            <div className="font-display text-lg font-extrabold text-white">How private is it?</div>
            <p className="mt-2">
              Files are read by JavaScript in this tab and never uploaded. There is no server, no analytics, and a Content-Security-Policy
              of <code className="rounded bg-white/10 px-1">connect-src &apos;self&apos;</code> blocks requests to anywhere else. Turn on airplane
              mode after the page loads — it still works.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
