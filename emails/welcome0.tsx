import * as React from 'react';
import { Text, Section, Button } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { Prose } from './components/prose';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { shadowOpenings } from './content';

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
 * immediately recognize), then transitions to bio, series intro, and CTA.
 *
 * Two paths:
 * - Named shadow (e.g. Willpower): uses ShadowOpening fields (scenes, story,
 *   relief, closingLine, ps) placed throughout the template.
 * - Bridge shadow ("Bringing Traits/Strengths"): uses dynamic bridge
 *   descriptions from chart data. Gets common framing but no shadow-specific
 *   fields.
 */
export const Welcome0 = ({
  firstName,
  chart,
  unsubscribeUrl,
  chartUrl,
}: Welcome0Props) => {
  const chartUrlWithUtm = `${chartUrl}?utm_source=email&utm_medium=email&utm_campaign=welcome0`;

  // Determine which shadow content to render.
  const hasBridgeShadow = chart.topShadow === 'Bringing Traits/Strengths';
  const bridgesToShow = hasBridgeShadow
    ? chart.bridgeDescriptions.slice(0, 1)
    : [];
  const shadow =
    chart.topShadow && !hasBridgeShadow
      ? (shadowOpenings.get(chart.topShadow) ?? null)
      : null;
  const hasShadowContent = hasBridgeShadow
    ? bridgesToShow.length > 0
    : shadow !== null;

  return (
    <EmailLayout
      preview="It's nothing personal. It's just mechanics."
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Greeting + common opener */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Thanks for signing up to see how you&apos;re designed! I&apos;m excited
        to be here to support you.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {hasBridgeShadow
          ? "Before anything else, one thing from your chart. Does this resonate?"
          : "Before anything else, one thing from your chart. Do any of these sound familiar?"}
      </Text>

      {/* --- Shadow-specific: scenes --- */}
      {shadow && <Prose content={shadow.scenes} />}

      {/* --- Bridge shadow: dynamic descriptions --- */}
      {hasBridgeShadow &&
        bridgesToShow.map((bridge, i) => (
          <Text
            key={i}
            className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]"
          >
            {bridge.description}
          </Text>
        ))}

      {/* --- Common transition --- */}
      {hasShadowContent && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          I didn&apos;t guess that. It&apos;s part of your nature.
        </Text>
      )}

      {/* --- Shadow-specific: story --- */}
      {shadow && (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {shadow.story}
          </Text>
        </>
      )}

      {/* --- CTA --- */}
      <Section className="mt-[24px] mb-[24px] text-center">
        <Button
          href={chartUrlWithUtm}
          className="rounded-[8px] bg-[#6A4BD6] px-[24px] py-[12px] text-[16px] font-semibold text-white"
        >
          Your full chart →
        </Button>
      </Section>

      {/* --- Bio --- */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        I&apos;m Shawn — certified BG5 Career &amp; Business Consultant,
        certified Living Your Design Guide, and certified Authentic Relating
        facilitator.
      </Text>

      {/* --- Series intro --- */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Over the next few days you&apos;ll see how you are designed to function
        best in the world. You&apos;ll begin to recognize your own patterns, and
        then learn how to listen to your unique way of being. That will help you
        make decisions you can trust, rather than being dependent on advice from
        others. Advice based on their way of being, not yours.
      </Text>

      {/* --- Shadow-specific: relief + signatureTheme --- */}
      {shadow && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          Even though these tendencies are part of you, you aren&apos;t doomed.
          Within the shadow always lies the gift. Eventually,{' '}
          {shadow.relief}. It won&apos;t happen overnight. But it&apos;s simpler
          than you think.
        </Text>
      )}

      {/* --- Bridge shadow: relief --- */}
      {hasBridgeShadow && bridgesToShow.length > 0 && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          Even though these tendencies are part of you, you aren&apos;t doomed.{' '}
          <strong>
            You are designed to work with someone who brings this exact ability
          </strong>{' '}
          — it&apos;s part of their gifts, not yours. When you find them, you
          complete each other.
        </Text>
      )}

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Tomorrow we start. I hope this knowledge brings you{' '}
        {chart.signatureTheme}, like it has for me.
      </Text>

      {/* --- Closing question --- */}
      <Text className="mb-[16px] text-[16px] font-bold leading-[24px] text-[#4A4A4A]">
        One question, and I read every reply:
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Did I get that right? If I did, tell me. If I missed, tell me that too —
        I&apos;d love to know.
      </Text>

      {/* --- Shadow-specific: closingLine --- */}
      {shadow && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          {shadow.closingLine}
        </Text>
      )}

      {/* --- Shadow-specific: P.S. (italic, last thing before signature) --- */}
      {shadow?.ps && (
        <Text className="mb-[16px] text-[16px] italic leading-[24px] text-[#4A4A4A]">
          {shadow.ps}
        </Text>
      )}
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
    bridgeDescriptions: [],
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
  chartUrl: 'https://livecorrectly.com/see-your-design/test-id',
} satisfies Welcome0Props;

export default Welcome0;
