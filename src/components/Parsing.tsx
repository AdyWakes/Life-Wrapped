import { motion } from 'framer-motion';

export function Parsing({ fraction, label }: { fraction: number; label: string }) {
  const pct = Math.round(fraction * 100);
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-6xl" aria-hidden>
        🎁
      </motion.div>
      <div className="mt-6 font-display text-3xl font-extrabold">Wrapping your year…</div>
      <div className="mt-6 h-3 w-full max-w-sm overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 max-w-sm truncate text-sm text-white/60">
        {pct}% · {label}
      </div>
      <div className="mt-8 text-xs text-white/40">Everything is processed on this device.</div>
    </div>
  );
}
