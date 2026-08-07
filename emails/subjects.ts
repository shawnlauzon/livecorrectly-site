import { EmailChartData } from '../lib/hd-chart/parse-for-email';

export function getWelcomePreview(
  step: number,
  firstName: string,
  chart: EmailChartData
): string {
  switch (step) {
    case 0:
      return "It's nothing personal. It's just mechanics.";
    case 1:
      return "It's good advice. It's just not yours.";
    case 2:
      return `You are designed to ${chart.strategy}`;
    case 3:
      return `To make decisions you can trust, ${chart.innerAuthorityDescription}`;
    case 4:
      return `Follow this advice for less ${chart.notSelfTheme} and more ${chart.signatureTheme}`;
    case 5:
      return `Congratulations ${firstName} on entering your life of flow`;
    default:
      return '';
  }
}

export function getWelcomeSubject(
  step: number,
  firstName: string,
  chart: EmailChartData
): string {
  switch (step) {
    case 0:
      return 'The chart you asked for, and what it shows';
    case 1:
      return 'The advice that was never for you';
    case 2:
      return `[Day 2] You are designed to ${chart.strategy}`;
    case 3:
      return `[Day 3] To make decisions you can trust, ${chart.innerAuthorityDescription}`;
    case 4:
      return `[Day 4] Follow this advice for less ${chart.notSelfTheme} and more ${chart.signatureTheme}`;
    case 5:
      return `[Day 5] Congratulations ${firstName} on entering your life of flow`;
    default:
      return '';
  }
}
