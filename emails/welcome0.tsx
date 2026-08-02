import * as React from 'react';
import { Text, Section, Button } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { shadowOpenings } from '../lib/email-content';

interface Welcome0Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  chartUrl: string;
}

/**
 * Welcome Email 0: Shadow hook (sent immediately on registration)
 *
 * This is NOT part of the 5-day drip series — it fires at registration time.
 * Opens with the subscriber's #1 shadow (a conditioning pattern they'll
 * immediately recognize), then transitions to a common closing that
 * introduces Shawn and the upcoming email series.
 */
export const Welcome0 = ({
  firstName,
  chart,
  unsubscribeUrl,
  chartUrl
}: Welcome0Props) => {
  const chartUrlWithUtm = `${chartUrl}?utm_source=email&utm_medium=email&utm_campaign=welcome0`;

  // Determine which shadow content to render.
  // For bridge shadows, limit to 2 descriptions to keep the email focused.
  const hasBridgeShadow = chart.topShadow === 'Bringing Traits/Strengths';
  const bridgesToShow = hasBridgeShadow
    ? chart.bridgeDescriptions.slice(0, 2)
    : [];
  const shadowParagraphs = chart.topShadow && !hasBridgeShadow
    ? shadowOpenings.get(chart.topShadow) ?? null
    : null;
  const hasShadowContent = hasBridgeShadow
    ? bridgesToShow.length > 0
    : shadowParagraphs !== null;

  return (
    <EmailLayout
      preview="Something your design says about you"
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Shadow-specific opening */}
      {hasBridgeShadow && bridgesToShow.map((bridge, i) => (
        <Text
          key={i}
          className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]"
        >
          {bridge.description}
        </Text>
      ))}

      {shadowParagraphs && shadowParagraphs.map((paragraph, i) => (
        <Text
          key={i}
          className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]"
        >
          {paragraph}
        </Text>
      ))}

      {/* Common closing */}
      {hasShadowContent && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          I didn&apos;t guess that. It came out of your birth time.
        </Text>
      )}

      <Section className="mt-[24px] mb-[24px] text-center">
        <Button
          href={chartUrlWithUtm}
          className="rounded-[8px] bg-[#6A4BD6] px-[24px] py-[12px] text-[16px] font-semibold text-white"
        >
          See your full chart
        </Button>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        I&apos;m Shawn — certified BG5 Career &amp; Business Consultant. Over
        the next few days: four short emails on how you&apos;re built to work.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Did I get that right? Hit reply and tell me. If I missed, tell me that
        too.
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
    signatureVideo: 'https://youtu.be/fHGRdJSyE34',
    topShadow: 'Willpower',
    bridgeDescriptions: []
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
  chartUrl: 'https://livecorrectly.com/see-your-design/test-id'
} satisfies Welcome0Props;

export default Welcome0;
