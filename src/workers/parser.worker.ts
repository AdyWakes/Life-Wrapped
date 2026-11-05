/// <reference lib="webworker" />
/**
 * All parsing and number crunching happens here, off the main thread, inside your browser.
 * This worker has no network code: it receives File objects from the page, reads them locally,
 * and posts back plain numbers. The page's CSP (connect-src 'self') blocks any outbound request anyway.
 */
import { ingest } from '../parsers/ingest';
import { summarize } from '../stats/summary';
import { computeStats } from '../stats/compute';
import { generateDemoFiles } from '../demo/generateDemo';
import type { Dataset } from '../types';
import type { WorkerRequest, WorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;
let dataset: Dataset | null = null;

const post = (msg: WorkerResponse) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === 'parse' || req.type === 'demo') {
      const files = req.type === 'demo' ? generateDemoFiles() : req.files;
      const localeHint = req.type === 'parse' ? req.localeHint : 'en-IN';
      let last = 0;
      dataset = await ingest(files, {
        localeHint,
        onProgress: (fraction, label) => {
          const now = Date.now();
          if (now - last < 50 && fraction < 1) return;
          last = now;
          post({ type: 'progress', id: req.id, fraction, label });
        },
      });
      post({ type: 'parsed', id: req.id, summary: summarize(dataset) });
    } else if (req.type === 'compute') {
      if (!dataset) throw new Error('No data loaded');
      post({ type: 'stats', id: req.id, stats: computeStats(dataset, req.options) });
    }
  } catch (err) {
    post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) });
  }
};
