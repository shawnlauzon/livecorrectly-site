import { ChartRecord } from './chart';

export type EmailStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'failed' | 'suppressed';

// Subscriber interface matching the database schema
export interface Subscriber {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  birth_date: string; // ISO date string
  birth_time: string | null; // ISO time string
  time_unknown: boolean;
  birth_place: string;
  birth_lat: number | null;
  birth_lng: number | null;
  chart: ChartRecord;
  seq_position: number;
  next_send_at: string | null; // ISO timestamp
  email_status: EmailStatus;
  email_status_at: string | null; // ISO timestamp
  unsub_token: string;
  created_at: string; // ISO timestamp
}
