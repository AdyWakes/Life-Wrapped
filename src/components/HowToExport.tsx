import { useState } from 'react';

const GUIDES = {
  'WhatsApp · Android': [
    'Open the chat (1:1 or group) → tap ⋮ (top right) → More → Export chat.',
    'Choose “Without media” (faster, smaller).',
    'Save it to Files / Drive, or send it to yourself, then pick the .txt or .zip here.',
    'Repeat for your top chats — you can drop several files at once.',
  ],
  'WhatsApp · iPhone': [
    'Open the chat → tap the contact or group name at the top.',
    'Scroll down → Export Chat → Without Media.',
    'Choose “Save to Files”, then pick the .zip here (no need to unzip).',
    'Repeat for your top chats — you can select several files at once.',
  ],
  'Instagram (any phone)': [
    'Profile → ☰ → Accounts Center → Your information and permissions → Download your information.',
    'Choose “Some of your information”: Messages, Likes, Saved, Story interactions, Comments, Personal information.',
    'Set Format = JSON (important!), Date range = Last year or All time, Media quality = Low.',
    'Meta emails you a link (minutes to hours). Download the .zip and drop it here.',
  ],
} as const;

export function HowToExport() {
  const keys = Object.keys(GUIDES) as (keyof typeof GUIDES)[];
  const [tab, setTab] = useState<keyof typeof GUIDES>(keys[0]!);
  return (
    <div className="rounded-3xl bg-white/5 p-5 sm:p-6">
      <div className="font-display text-lg font-extrabold">How to get your export</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${tab === k ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
          >
            {k}
          </button>
        ))}
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/80">
        {GUIDES[tab].map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
