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
  unsub_from: string | null; // utm_campaign value from the email that triggered unsubscribe
  unsub_token: string;
  created_at: string; // ISO timestamp
  last_engaged_at: string | null; // ISO timestamp — most recent proof of life
}
