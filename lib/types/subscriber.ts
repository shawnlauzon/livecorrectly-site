import { ChartRecord } from './chart';

export type EmailStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'failed' | 'suppressed';

/** The user's original birth inputs, stored as JSONB. */
export interface BirthInput {
  date: string;           // "YYYY-MM-DD"
  time: string | null;    // "HH:MM" or null
  timeUnknown: boolean;
  city: string;
  country: string;        // 2-letter abbreviation e.g. "US"
}

// Subscriber interface matching the database schema
export interface Subscriber {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  birth_input: BirthInput;
  chart: ChartRecord;
  next_step: number;
  welcome_resend_step: number | null;
  email_status: EmailStatus;
  email_status_at: string | null; // ISO timestamp
  unsub_token: string;
  created_at: string; // ISO timestamp
}

/**
 * The subset of a subscriber the chart page (`/see-your-design/[id]`) renders.
 * That page is reachable by anyone with the link, so contact details and
 * tokens (email, unsub_token) and pipeline state never leave the server.
 */
export type PublicSubscriber = Pick<
  Subscriber,
  'first_name' | 'last_name' | 'birth_input' | 'chart' | 'email_status'
>;

export function toPublicSubscriber(subscriber: Subscriber): PublicSubscriber {
  return {
    first_name: subscriber.first_name,
    last_name: subscriber.last_name,
    birth_input: subscriber.birth_input,
    chart: subscriber.chart,
    email_status: subscriber.email_status,
  };
}

/** A record of an email sent to a subscriber. */
export interface EmailSend {
  id: string;
  subscriber_id: string;
  email_type: string;        // 'welcome_1', 'newsletter_6', 'broadcast_restart-notice-2026-09'
  category: string;          // 'welcome' | 'newsletter' | 'broadcast'
  resend_email_id: string | null;
  resend_broadcast_id: string | null;
  sent_at: string;           // ISO timestamp
}

export type EmailEventType = 'open' | 'click' | 'unsubscribe' | 'manual_engagement' | 'reply';

/** A tracked event for a subscriber (open, click, unsubscribe, manual engagement, reply). */
export interface EmailEvent {
  id: string;
  subscriber_id: string;
  email_send_id: string | null;
  event_type: EmailEventType;
  email_type: string;        // denormalized for easy queries
  link_url: string | null;   // for clicks
  resend_email_id: string | null;
  occurred_at: string;       // ISO timestamp
  created_at: string;        // ISO timestamp
}
