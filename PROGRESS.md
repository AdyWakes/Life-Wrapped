# Progress

## Done
- **Phase 1**: Vite + React + TS (strict) + Tailwind scaffold, CI workflow (typecheck, test, build, privacy check), CSP plugin, self-hosted fonts.
- **Phase 2**: WhatsApp parser (Android/iOS, DMY/MDY/YMD auto-detect, 12h/24h, U+202F, LRM marks, multi-line, system/media/deleted/call, Hindi/Hinglish), lazy zip reader + JSZip fallback, ingest layer.
- **Phase 3**: Stats engine (totals + novel comparison, top people, 7×24 heatmap + 3am club, emoji/words with EN+Hinglish+Hindi stopwords, both-sides daily streaks, median reply times, Instagram stats, rule-based personality, setup summary with "me" suggestion).
- **Phase 4**: Parser Web Worker + promise client; landing (drop zone, folder picker, how-to-export tabs, privacy badge); parsing progress screen; setup (who-are-you multi-select with search, year picker incl. All time, skipped-file warnings); story player (tap/hold/swipe/keys, progress segments, slide transitions); 8 cards on a 1080×1920 canvas; PNG export via html-to-image; save-all.
- **Phase 5**: Instagram JSON parser. Tree search by file name covers the current layout, the 2022 layout, and loose files/folders. Also: mojibake fix, likes/saved/story/comments in classic and 2024+ `label_values` shapes, profile → auto "me", message requests skipped, HTML exports warned.
- **Phase 6**: Demo mode. A seeded synthetic WhatsApp (4 formats, 5 people, 2 groups) + Instagram export is generated in the worker and parsed by the real pipeline. It fills all 8 cards.
- **Phase 7**: README, CONTRIBUTING, GitHub Pages workflow, `vercel.json` (CSP + security headers), OG image, preview grid.
- **Self-review**:
  - Offline-safe: the worker and export fonts are preloaded; tested in airplane mode.
  - Cards no longer re-render 60×/s.
  - Auto-fit guard on card content.
  - iOS share-gesture fallback.
  - Mobile "share all 8 images".
  - Reply-card guards.
  - January default year.
  - Stress-tested with long and Devanagari names, 250k messages (1.2s, no UI freeze), 4 viewports, gestures.
  - Confirmed zero external requests.

## In progress
- Nothing. All phases complete.

## Next (suggested)
- Test on real iPhone Safari + Android Chrome with real exports (see MORNING.md checklist).
- Record the README GIF (`docs/demo.gif`) and swap it in for the preview grid.
- Merge to `main` → enable GitHub Pages (Settings → Pages → Source: GitHub Actions), or import into Vercel.
- Good first issues listed in README (Telegram, more WhatsApp locales, PWA share target, group card, a11y).

## Known issues / risks
- Not run on real WebKit (iOS Safari). html-to-image + WebKit is the main risk for PNG export; a triple-render workaround is in place but unverified.
- Parsers were only exercised with synthetic fixtures. Unusual locales are untested: Devanagari digits, localized AM/PM words, and non-English system messages in Android 1:1 chats.
- Cross-platform person merge needs exact display-name match.
- No ESLint config (typecheck is strict; tests cover logic).
- Playwright `setInputFiles` with a path containing Devanagari + emoji silently fails. This is a test-harness quirk, not an app bug: it works when passed as a buffer.
