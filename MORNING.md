# Good morning ☀️ — lifewrapped status

## 10-line summary
1. All 7 phases are done, each committed and pushed to `claude/lifewrapped-data-review-app-0tmhu7`, plus a self-review pass.
2. Stack as specified: Vite 6 + React 18 + TS (strict) + Tailwind 3 + Framer Motion + JSZip + html-to-image, parsing in a Web Worker.
3. WhatsApp parser covers Android and iOS, DMY/MDY/YMD (detected from the data), 12h/24h, multi-line, system/media/deleted/call lines, Hindi/Hinglish/emoji, .txt and .zip, several files at once.
4. Instagram parser finds files by name anywhere in the zip, merges `message_N.json` threads, fixes mojibake, and reads likes/saved/stories/comments/profile. Large zips are read lazily, so only the JSON inside is decompressed.
5. 8 cards render on a 1080×1920 canvas, and only cards with data show. The story player has tap, hold, swipe and keyboard controls. Every exported PNG carries the watermark and repo URL.
6. Share uses the native share sheet on phones: one card, or all 8 in one go ("Save 8 images"). Desktop gets a PNG or a zip download.
7. Demo mode generates synthetic WhatsApp (4 phone formats) and Instagram exports and runs them through the real parsers. It lands on "Night Owl Yapper" in under 1s.
8. Privacy: a strict CSP (`connect-src 'self'`) and no network code. A CI script fails the build on fetch/XHR/WebSocket or on third-party URLs in the bundle. Airplane mode after page load works (tested).
9. 65 Vitest tests (parsers, zip, stats, demo pipeline, 200k-message performance) pass. `typecheck`, `build` and `check:network` are green.
10. Browser checks in headless Chromium: 250k messages parse in 1.2s with no UI freeze. PNG export, zip, share, gestures and offline all work, with no horizontal overflow at 360/375px, landscape or desktop.

## What works (verified)
- Full flow: landing → drop files → progress bar → "who are you?" (pre-selected from hints) + year picker → story → share or download.
- Exports are pixel-identical to the screen, 1080×1920, about 300ms per card in Chromium.
- Zero external requests during demo, parsing and export (checked with Playwright's request log and offline mode).
- Deploy configs: `.github/workflows/deploy-pages.yml` (GitHub Pages) and `vercel.json` (CSP and security headers).

## What's weak / unverified
- **Not tested on a real iPhone or Android phone.** I only had headless Chromium. The biggest risk is html-to-image on iOS Safari: missing fonts or emoji on the first export. I added the usual "render 3×" workaround for WebKit, but it's untested.
- **Parsers have only seen synthetic fixtures.** These copy every format I know of, but real exports in other locales may still break. Examples: Devanagari digits, localized AM/PM like "पूर्वाह्न", non-English system lines on Android 1:1 chats.
- **Instagram's newest `label_values` JSON format** is handled generically, but I wrote it from my knowledge of Meta's schema, not from a fresh 2026 export.
- People are only merged across WhatsApp and Instagram when the display names match exactly. "Priya" on WhatsApp and "Priya S" on Instagram stay two people.
- Personality thresholds and copy are my first guess. Tune them with real data.
- The README GIF is a placeholder (a static grid of demo cards in `docs/cards-preview.jpg`).
- No ESLint, no PWA/service worker, no share-target (listed as good first issues).
- PNGs are about 2MB each, which could be slow to share on low-end phones.

## Exact steps to test

```bash
git fetch origin claude/lifewrapped-data-review-app-0tmhu7
git checkout claude/lifewrapped-data-review-app-0tmhu7
npm install
npm test
npm run build && npm run check:network
npm run preview        # http://localhost:4173 (production build, with the real CSP)
```

**On your phone (most important):** Web Share needs HTTPS, so a plain LAN URL won't show the share button. Use one of these:
- Deploy a Vercel preview (import the repo; `vercel.json` handles the rest), or merge to `main` and enable *Settings → Pages → Source: GitHub Actions*. Then open the HTTPS URL on your phone.
- For a quick non-share check: `npx vite preview --host`, then open the LAN URL on your phone (same Wi-Fi).

**Manual checklist with your real exports:**
1. Tap "Try with sample data". It should play 8 cards, and "Share card" should open the share sheet. Check that emoji and fonts look right in the saved PNG (iOS Safari especially).
2. Export 3–5 real WhatsApp chats (Android: ⋮ → More → Export chat → Without media; iPhone: contact name → Export Chat → Without Media → Save to Files). Drop them all at once.
   - Is the right person pre-selected under "Which one is you?"
   - Do the dates look right? On the Streak card, check that the date range makes sense. A wrong dd/mm vs mm/dd guess shows up as weird dates.
   - Do any system lines ("X added Y", "Messages and calls are end-to-end encrypted") show up as a person or in top words? They shouldn't.
3. Drop the iPhone `.zip` as-is (don't unzip it). The chat name should come from the zip name.
4. Instagram: request JSON (Messages, Likes, Saved, Story interactions, Comments, Personal information) and drop the zip.
   - Hindi and emoji in DMs should render properly (no "Ã°Å¸").
   - Card 7 should show likes and top accounts.
   - Your IG name should be auto-selected.
5. Try "Save all" on the phone. It should offer to save 8 images.
6. Turn on airplane mode after the page loads, then do a full run. It should still work.
7. If something parses wrong, copy the *shape* of the offending line (anonymised) into a fixture in `tests/fixtures/generate-whatsapp.mjs` and add a test. Never commit the real file.

Other files: `PROGRESS.md` (status), `DECISIONS.md` (40 logged choices with reasoning), `README.md`, `CONTRIBUTING.md`.
