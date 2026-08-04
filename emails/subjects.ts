import { EmailChartData } from '../lib/hd-chart/parse-for-email';

export function getWelcomeSubject(
  step: number,
  firstName: string,
  chart: EmailChartData
): string {
  switch (step) {
    case 0:
      return 'Something your design says about you';
    case 1:
      return `[Day 1] ${firstName}, you are designed to be a ${chart.careerDesign}`;
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
