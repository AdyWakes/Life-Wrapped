import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Strict Content-Security-Policy injected into the production HTML.
 * connect-src 'self' means the page physically cannot send your data anywhere.
 * (Not applied in dev because Vite's HMR needs inline scripts + websockets.)
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'lifewrapped-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!--CSP-->',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  // Relative base works for GitHub Pages project sites (/Life-Wrapped/) and Vercel root alike.
  base: process.env.VITE_BASE ?? './',
  plugins: [react(), cspPlugin()],
  worker: { format: 'es' },
  build: {
    target: ['es2020', 'safari15', 'chrome100'],
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
