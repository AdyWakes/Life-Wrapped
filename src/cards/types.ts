import type { ComponentType } from 'react';
import type { WrappedStats } from '../stats/types';

export interface CardProps {
  stats: WrappedStats;
  index: number;
  total: number;
}

export interface CardDef {
  id: string;
  title: string;
  /** Seconds on screen before auto-advancing. */
  duration: number;
  Component: ComponentType<CardProps>;
}
