import type { DatasetSummary, StatsOptions } from '../types';
import type { WrappedStats } from '../stats/types';

export type WorkerRequest =
  | { type: 'parse'; id: number; files: { name: string; blob: Blob }[]; localeHint?: string }
  | { type: 'demo'; id: number }
  | { type: 'compute'; id: number; options: StatsOptions };

export type WorkerResponse =
  | { type: 'progress'; id: number; fraction: number; label: string }
  | { type: 'parsed'; id: number; summary: DatasetSummary }
  | { type: 'stats'; id: number; stats: WrappedStats }
  | { type: 'error'; id: number; message: string };
