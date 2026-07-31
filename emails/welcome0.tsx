import * as React from 'react';
import { Heading, Text, Section, Button } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';

interface Welcome0Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  chartUrl: string;
}

/**
 * Welcome Email 0: Chart confirmation (sent immediately on registration)
 *
 * This is NOT part of the 5-day drip series — it fires at registration time
 * to confirm the chart is ready and preview what's coming over the next 5 days.
 */
export const Welcome0 = ({
  firstName,
  chart,
  unsubscribeUrl,
  chartUrl
}: Welcome0Props) => {
  return (
    <EmailLayout
      preview={`${firstName}, your Human Design chart is ready`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h1"
        className="mt-0 text-[24px] font-bold text-left text-[#221B3D]"
      >
        {firstName}, your chart is ready!
      </Heading>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Your Human Design chart has been generated. You are a{' '}
        <strong>{chart.careerDesign}</strong> (also known as a {chart.type}).
      </Text>

      <Section className="mt-[24px] mb-[24px] text-center">
        <Button
          href={chartUrl}
          className="rounded-[8px] bg-[#6A4BD6] px-[24px] py-[12px] text-[16px] font-semibold text-white"
        >
          View your chart
        </Button>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Over the next five days, you&apos;ll receive a short email each day that
        walks you through the most important parts of your design:
      </Text>

      <Section className="mb-[16px] bg-[#F6F3FC] p-[16px]">
        <Text className="m-0 text-[16px] leading-[28px] text-[#221B3D]">
          <strong>Day 1</strong> — Your career type
          <br />
          <strong>Day 2</strong> — Your strategy for making moves
          <br />
          <strong>Day 3</strong> — How to make decisions you can trust
          <br />
          <strong>Day 4</strong> — Signs you&apos;re on (or off) track
          <br />
          <strong>Day 5</strong> — Putting it all together
        </Text>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Day 1 arrives tomorrow. In the meantime, take a look at your chart —
        you might be surprised by what you see.
      </Text>
    </EmailLayout>
  );
};

Welcome0.PreviewProps = {
  firstName: 'Shawn',
  chart: {
    type: 'Generator',
    isGenerator: true,
    isPureGenerator: true,
    isManifestingGenerator: false,
    isManifestor: false,
    isProjector: false,
    isReflector: false,
    careerDesign: '🔥 Classic Builder',
    strategy: 'wait to respond before engaging',
    innerAuthority: 'Emotional',
    innerAuthorityDescription: 'wait for emotional clarity',
    signatureTheme: 'satisfaction',
    notSelfTheme: 'frustration',
    signatureThemeAdjective: 'satisfied',
    notSelfThemeAdjective: 'frustrated',
    decisionMakingStrategy:
      'wait to respond before engaging, and then wait for emotional clarity',
    isEmotionalAuthority: true,
    typeVideo: 'https://youtu.be/9PVgkBzpPqs',
    typeButtonGif:
      'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34'
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
  chartUrl: 'https://livecorrectly.com/see-your-design/test-id'
} satisfies Welcome0Props;

export default Welcome0;
