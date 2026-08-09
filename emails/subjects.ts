import { EmailChartData } from '../lib/hd-chart/parse-for-email';

export function getWelcomePreview(
  step: number,
  firstName: string,
  chart: EmailChartData,
): string {
  switch (step) {
    case 0:
      return "It's nothing personal. It's just mechanics.";
    case 1:
      return "It's good advice. It's just not yours.";
    case 2:
      return 'A test you can run in ten seconds.';
    case 3:
      return 'Being honest about the limit.';
    default:
      return '';
  }
}

export function getWelcomeSubject(
  step: number,
  firstName: string,
  chart: EmailChartData,
): string {
  switch (step) {
    case 0:
      return 'The chart you asked for, and what it shows';
    case 1:
      return 'The advice that was never for you';
    case 2:
      return 'Are you in the flow?';
    case 3:
      return "What these emails can't do";
    default:
      return '';
  }
}
