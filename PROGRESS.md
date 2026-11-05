# Progress

## Done
- Phase 1: Vite + React + TS (strict) + Tailwind scaffold, CI workflow (typecheck, test, build, privacy check), CSP plugin, fonts.
- Phase 2: WhatsApp parser (Android/iOS, DMY/MDY/YMD auto-detect, 12h/24h, U+202F, LRM marks, multi-line, system/media/deleted/call, Hindi/Hinglish), lazy zip reader + JSZip fallback, ingest layer.
- Phase 3: stats engine (totals + novel comparison, top people, 7x24 heatmap + 3am club, emoji/words with EN+Hinglish+Hindi stopwords, both-sides daily streaks, median reply times, Instagram stats, rule-based personality, setup summary with "me" suggestion). 49 tests passing.
- Phase 4: parser Web Worker + promise client, landing (drop zone, folder picker, how-to-export tabs, privacy badge), parsing progress screen, setup (who-are-you multi-select with search, year picker incl. All time, skipped-file warnings), Instagram-style story player (tap/hold/swipe/keys, progress segments, slide transitions), 8 cards on a 1080×1920 canvas, PNG export via html-to-image (share sheet or download), save-all zip. Smoke-tested in headless Chromium at 390×844: no console errors, zero external requests.

## In progress
- Phase 5: Instagram parser

## Next
- 6 demo mode, 7 README + deploy, then self-review

## Known issues
- none yet
