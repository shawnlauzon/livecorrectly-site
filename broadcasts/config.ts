import type { Subscriber } from '@/lib/types/subscriber';

export type BroadcastFilter = (subscriber: Subscriber) => boolean;

export const createdBefore2026Aug: BroadcastFilter = (s) =>
  new Date(s.created_at) < new Date('2026-08-01');

export const stuckAtStepOneBefore2026Sep: BroadcastFilter = (s) =>
  s.next_step === 1 && new Date(s.created_at) < new Date('2026-09-01');
