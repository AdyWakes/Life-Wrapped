# Decisions log

Choices made while building autonomously. Format: **what** — why (alternatives).

1. **React 18.3 + framer-motion 11 + Vite 6 + Vitest 3 + Tailwind 3.4** — mature, well-known combination; Tailwind 3's config file is simpler than v4 and has no Rust binary to install. (Alternatives: React 19 / Tailwind 4 / Vite 8 — newer but more upgrade risk right before a launch.)
2. **CSP injected only into the production build** via a tiny Vite plugin — Vite's dev server needs inline scripts and a websocket for HMR, which a strict CSP would block. Vercel additionally sends the CSP as an HTTP header (`vercel.json`). (Alternative: a looser dev CSP — adds noise for no privacy gain.)
3. **`base: './'`** — relative asset URLs work both on GitHub Pages project sites (`/Life-Wrapped/`) and on Vercel's root without a per-host config. The app has no client routing so there is no downside.
4. **Self-hosted fonts via @fontsource** (Bricolage Grotesque for display, Inter for body) — no Google Fonts request, CSP stays `'self'`, and html-to-image can embed them in PNGs.
5. **`scripts/check-no-network.mjs` in CI** — fails the build if app code calls fetch/XHR/WebSocket/sendBeacon or the bundle references a non-allowlisted origin. This is the "proof" the privacy badge links to, together with the CSP.
6. **Date order auto-detection** — 4-digit first part ⇒ YMD; any first part > 12 ⇒ DMY; any second part > 12 ⇒ MDY; otherwise choose the order that makes the chat most chronological; final tie-break is the browser locale (en-US ⇒ MDY, everything else ⇒ DMY, since the launch audience is largely India). (Alternative: ask the user — adds friction for a case the data almost always answers.)
7. **iOS system-message detection uses the leading U+200E mark** — iOS prefixes system lines and media placeholders with LRM and attributes them to the group/contact name. Media/deleted/call placeholders are matched first, any other LRM-prefixed text is system. Risk: a real message beginning with LRM (rare, some RTL text) is dropped.
8. **"Me" hints** — the sender of "You deleted this message" is definitely the user; the contact in "WhatsApp Chat with X" and the sender of the iOS encryption notice in a 1:1 chat are definitely not. Used to pre-select "who are you?".
9. **Lazy zip reader** (`src/parsers/zip.ts`) reads only the central directory + needed entries via `Blob.slice` and native `DecompressionStream('deflate-raw')`, with JSZip as fallback. Multi-GB Instagram exports with media would otherwise crash a phone's tab. (Alternative: JSZip only — simpler but loads the whole archive into RAM.)
10. **Calls and system lines are not counted as messages**; deleted messages and media are counted as messages sent but excluded from word/emoji stats.
11. **Top people come from 1:1 chats** (WhatsApp + Instagram merged by display name). Group members are only ranked when there are no 1:1 chats — otherwise loud group members would outrank your actual best friend. The biggest group gets a separate mention.
12. **Streak = consecutive days where *both* of you sent at least one message** in a 1:1 chat — a one-sided "good morning" forward chain isn't "chatting". (Alternative: any message from either side — bigger numbers, less honest.)
13. **Reply time = gap between the last message of their turn and the first of yours**, ignoring gaps > 24h (new conversation, not a reply). Medians, need ≥5 samples, only judged for your top 15 people.
14. **Heatmap / 3am club use the messages *you* sent** (falls back to all messages if "me" sent none). "Late night" = 00:00–04:59; "3am club" = 03:00–03:59.
15. **Novel comparison** = words you sent / 90,000 words per novel; below half a novel we switch to short stories (7,500 words).
16. **Default year** = the current calendar year if the data has any messages in it, otherwise the most recent year with data.
