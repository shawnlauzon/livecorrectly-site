import fakeResponse from '@/public/fake-mmi-response.json';
import { parseChartForEmail, type EmailChartData } from '@/lib/hd-chart/parse-for-email';
import type { ChartRecord } from '@/lib/types/chart';

/**
 * Example chart used to render newsletter web pages for visitors without a
 * chart (anonymous or shared links), so personalized sentences read naturally.
 * Same fixture the chart form uses as its dev fallback.
 */
export const SAMPLE_CHART: EmailChartData = parseChartForEmail(
  (fakeResponse as unknown as ChartRecord).chart,
);
