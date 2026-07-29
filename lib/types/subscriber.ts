import { ChartRecord } from './chart';

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
  birth_tz: string | null;
  chart: ChartRecord;
  seq_position: number;
  next_send_at: string | null; // ISO timestamp
  unsubscribed: boolean;
  created_at: string; // ISO timestamp
}
