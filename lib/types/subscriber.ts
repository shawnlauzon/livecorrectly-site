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
