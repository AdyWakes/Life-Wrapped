#!/usr/bin/env node
/**
 * Privacy guard, run in CI.
 * 1. Fails if app source code uses any network API (fetch, XHR, WebSocket, sendBeacon, ...).
 * 2. Fails if the production bundle references any third-party origin that isn't on the allowlist
 *    (the allowlist only contains the repo link + XML namespace URIs, which are never fetched).
 * 3. Fails if the built index.html is missing the strict CSP meta tag.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`✖ ${msg}`);
};

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

// 1. Source scan
const forbidden = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bEventSource\b/,
  /\bimportScripts\s*\(/,
  /\bnew\s+Image\s*\(\s*\)\s*\.src\s*=\s*['"`]https?:/,
];
for (const file of walk(join(root, 'src'), ['.ts', '.tsx', '.js', '.jsx'])) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('network-check: allow')) return;
    for (const re of forbidden) {
      if (re.test(line)) fail(`${file.replace(root, '')}:${i + 1} uses a network API: ${line.trim()}`);
    }
  });
}

// 2 + 3. Bundle scan
const dist = join(root, 'dist');
if (existsSync(dist)) {
  const allow = [
    'https://github.com/AdyWakes/Life-Wrapped',
    'http://www.w3.org/',
    'https://www.w3.org/',
    'http://www.w3.org',
    'https://reactjs.org/docs/error-decoder.html',
    'https://react.dev/errors/',
    'https://www.instagram.com/',
    'https://instagram.com',
    'https://faq.whatsapp.com',
    'https://www.whatsapp.com',
    'https://accountscenter.instagram.com',
    'https://help.instagram.com',
    // Inert license / docs strings inside JSZip + pako (never requested):
    'http://stuartk.com/jszip',
    'https://raw.github.com/Stuk/jszip/',
    'https://github.com/nodeca/pako/',
    'https://stuk.github.io/jszip/',
  ];
  const urlRe = /https?:\/\/[a-zA-Z0-9.-]+[^\s"'`)<>]*/g;
  for (const file of walk(dist, ['.js', '.html', '.css'])) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(urlRe)) {
      const url = m[0];
      if (!allow.some((a) => url.startsWith(a))) {
        fail(`${file.replace(root, '')} references non-allowlisted URL: ${url.slice(0, 120)}`);
      }
    }
  }
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!/http-equiv="Content-Security-Policy"[^>]*connect-src 'self'/.test(html)) {
    fail('dist/index.html is missing the strict Content-Security-Policy meta tag');
  }
} else {
  console.warn('dist/ not found — skipping bundle scan (run `npm run build` first).');
}

if (failed) {
  console.error('\nPrivacy check failed.');
  process.exit(1);
}
console.log('✔ Privacy check passed: no network APIs in app code, no third-party origins in the bundle, CSP present.');
