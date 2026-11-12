/**
 * NDJSON event protocol for real-time newsletter schedule progress.
 *
 * The schedule API streams these events as newline-delimited JSON.
 * The frontend reads the stream and updates a modal UI in real-time.
 */

export type ScheduleStepId =
  | 'load'
  | 'subscribers'
  | 'contact-properties'
  | 'templates'
  | 'render-broadcast'
  | 'segment'
  | 'segment-contacts'
  | 'broadcast'
  | 'records';

export interface ScheduleProgressEvent {
  step: ScheduleStepId;
  status: 'start' | 'progress' | 'done';
  label: string;
  detail?: string;
  current?: number;
  total?: number;
}

export interface ScheduleCompleteEvent {
  step: 'complete';
  result: {
    /** One per broadcast (a one-off to several segments has several); empty for a test send */
    scheduleIds: number[];
    kind: 'broadcast' | 'direct';
    /** One per segment sent to; empty for direct sends */
    broadcastIds: string[];
    contactCount: number;
    scheduledAt: string;
  };
}

export interface ScheduleErrorEvent {
  step: 'error';
  error: string;
  failedStep?: ScheduleStepId;
}

export type ScheduleEvent =
  | ScheduleProgressEvent
  | ScheduleCompleteEvent
  | ScheduleErrorEvent;
