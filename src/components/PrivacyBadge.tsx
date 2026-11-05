import { PRIVACY_PROOF_URL } from '../lib/config';

export function PrivacyBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={PRIVACY_PROOF_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="whitespace-nowrap">Your data never leaves your device</span>
      <span className="whitespace-nowrap text-emerald-300/70 underline decoration-dotted underline-offset-2">see the code</span>
    </a>
  );
}
