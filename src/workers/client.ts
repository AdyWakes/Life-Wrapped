import type { DatasetSummary, StatsOptions } from '../types';
import type { WrappedStats } from '../stats/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

type Progress = (fraction: number, label: string) => void;
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Promise wrapper around the parser worker. One worker holds the parsed data for the session. */
export class ParserClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void; onProgress?: Progress }>();

  constructor() {
    this.worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module', name: 'lifewrapped-parser' });
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (msg.type === 'progress') return p.onProgress?.(msg.fraction, msg.label);
      this.pending.delete(msg.id);
      if (msg.type === 'error') p.reject(new Error(msg.message));
      else if (msg.type === 'parsed') p.resolve(msg.summary as never);
      else if (msg.type === 'stats') p.resolve(msg.stats as never);
    };
    this.worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || 'Worker crashed'));
      this.pending.clear();
    };
  }

  private send<T>(req: WithoutId<WorkerRequest>, onProgress?: Progress): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: never) => void, reject, onProgress });
      this.worker.postMessage({ ...req, id } as WorkerRequest);
    });
  }

  parse(files: File[], onProgress?: Progress): Promise<DatasetSummary> {
    const payload = files.map((f) => ({ name: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, blob: f }));
    return this.send({ type: 'parse', files: payload, localeHint: navigator.language }, onProgress);
  }

  demo(onProgress?: Progress): Promise<DatasetSummary> {
    return this.send({ type: 'demo' }, onProgress);
  }

  compute(options: StatsOptions): Promise<WrappedStats> {
    return this.send({ type: 'compute', options });
  }

  terminate() {
    this.worker.terminate();
  }
}
