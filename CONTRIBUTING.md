# Contributing to lifewrapped

Thanks for helping! A few ground rules keep this project trustworthy.

## Privacy rules (non-negotiable)

1. **No real personal data in the repo.** Not in fixtures, issues, screenshots or PR descriptions. If you hit a parsing bug with your own export, reproduce it with a made-up fixture: copy the *shape* of the line (timestamp format, separators, invisible characters) and replace names and text.
2. **No network calls.** No `fetch`, analytics, error reporting, CDNs, web fonts from third parties. `npm run check:network` (run in CI after the build) enforces this, and the production CSP (`connect-src 'self'`) would block it anyway.
3. **Everything runs client-side.** Heavy work goes in the Web Worker (`src/workers/parser.worker.ts`), not the main thread.

## Workflow

```bash
npm install
npm run dev
npm test           # keep it green
npm run typecheck  # strict TS, no `any` escapes please
npm run build && npm run check:network
```

- Parsers must never throw on user input. Return what you can, push a human-readable string into `warnings` for the rest.
- Add tests for every format variant you support. Fixture generators live in `tests/fixtures/*.mjs`; run them to regenerate fixtures and commit both the script and the output.
- Cards are designed on a fixed **1080×1920** canvas (`src/cards/kit.tsx`). Use inline pixel sizes, avoid CSS `filter`/`backdrop-filter` and `background-clip: text` inside cards (they don’t survive PNG export on every browser), and wrap entrance animations in `<Reveal>` so the export renders the final state.
- Test on a real phone (`npm run build && npx vite preview --host`), especially iOS Safari.

## Adding a platform

See the “Adding a new platform” section of the [README](README.md#adding-a-new-platform-spotify-youtube-telegram-are-v2).

## Commit / PR style

Small focused PRs, a short description of *what* and *why*, and screenshots for visual changes (from the demo data only).
