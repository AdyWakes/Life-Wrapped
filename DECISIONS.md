# Decisions log

Choices made while building autonomously. Format: **what** — why (alternatives).

1. **React 18.3 + framer-motion 11 + Vite 6 + Vitest 3 + Tailwind 3.4** — mature, well-known combination; Tailwind 3's config file is simpler than v4 and has no Rust binary to install. (Alternatives: React 19 / Tailwind 4 / Vite 8 — newer but more upgrade risk right before a launch.)
2. **CSP injected only into the production build** via a tiny Vite plugin — Vite's dev server needs inline scripts and a websocket for HMR, which a strict CSP would block. Vercel additionally sends the CSP as an HTTP header (`vercel.json`). (Alternative: a looser dev CSP — adds noise for no privacy gain.)
3. **`base: './'`** — relative asset URLs work both on GitHub Pages project sites (`/Life-Wrapped/`) and on Vercel's root without a per-host config. The app has no client routing so there is no downside.
4. **Self-hosted fonts via @fontsource** (Bricolage Grotesque for display, Inter for body) — no Google Fonts request, CSP stays `'self'`, and html-to-image can embed them in PNGs.
5. **`scripts/check-no-network.mjs` in CI** — fails the build if app code calls fetch/XHR/WebSocket/sendBeacon or the bundle references a non-allowlisted origin. This is the "proof" the privacy badge links to, together with the CSP.
