import * as React from 'react';
import { Text, Section, Button } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { Prose } from './components/prose';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { shadowOpenings, formatPrompt, formatLandForYou } from './content';

interface Welcome0Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  chartUrl: string;
}

/**
 * Welcome Email 0: Shadow hook (sent immediately on registration)
 *
 * This is NOT part of the 3-day drip series — it fires at registration time.
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

  const reflectionPrompt = hasBridgeShadow
    ? formatPrompt('felt like this described you', chart)
    : formatPrompt('noticed any of these showing up in your life', chart);

  return (
    <EmailLayout
      preview="It's nothing personal. It's just mechanics."
      unsubscribeUrl={unsubscribeUrl}
      postscripts={[...(shadow?.ps ? [shadow.ps] : [])]}
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
        Before anything else, one thing from your chart. {reflectionPrompt}
      </Text>

      {/* --- Shadow-specific: scenes --- */}
      {shadow ? (
        <>
          <Prose content={shadow.scenes} />
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            These are all signs that{' '}
            <strong>you tend to {shadow.shadow}</strong>. When you see this,
            your mind might immediately start to self-blame and believe
            there&apos;s something wrong with you.
          </Text>
        </>
      ) : (
        <>
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

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {chart.hasChannelBridge
              ? "You might believe that this is one of the world's biggest flaws, and that if only that was changed, then you would be "
              : 'You might believe that this is one of your biggest flaws, and that if only you could fix it, then you would be '}
            {chart.isManifestor
              ? 'at peace'
              : chart.isReflector
                ? 'pleasantly surprised'
                : chart.signatureThemeAdjective}
            .
          </Text>
        </>
      )}

      {chart.hasChannelBridge ? (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            Not true. <strong>The world is perfect as it is.</strong>
          </Text>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            However, your rare gift is the ability to be objective and to help
            work on world problems. This is something very few people have.
          </Text>
        </>
      ) : (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            Not true. <strong>You are perfect as you are.</strong>
          </Text>

          {/* --- Bridge shadow: relief --- */}
          {hasBridgeShadow && bridgesToShow.length > 0 && (
            <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
              This gap is exactly where you are designed to collaborate with
              someone else. The ideal person who brings exactly the thing you
              need.
            </Text>
          )}
        </>
      )}

      {/* --- Shadow-specific: relief --- */}
      {shadow && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          Even if you struggle with this right now, it can become your
          superpower. Within the shadow always lies the gift. With the practices
          I&apos;ll be sharing with you, {shadow.relief}. It won&apos;t happen
          overnight. But there is a path.
        </Text>
      )}

      {/* --- Common transition --- */}
      {hasShadowContent && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          I didn&apos;t guess any of that. It&apos;s part of your nature.
        </Text>
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
        I&apos;m Shawn, certified BG5 Career &amp; Business Consultant,
        certified Living Your Design Guide, and certified Authentic Relating
        facilitator.
      </Text>

      {/* --- Shadow-specific: story --- */}
      {shadow && (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {shadow.story} {shadow.story && ' '}Through Human Design, I was able
            to clearly see my own patterns, and realize they&apos;re not
            something wrong with me personally. It&apos;s how my system works.
            It&apos;s just mechanics.
          </Text>
        </>
      )}

      {/* --- Series intro --- */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Over the next few days you&apos;ll begin to recognize your own patterns
        and learn how to listen to your unique way of doing and being. That will
        help you make decisions you can trust, and stop depending on advice from
        others. Advice which is based on their way of being, not yours.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Tomorrow we start. I hope this knowledge brings you{' '}
        {chart.signatureTheme}, like it has for me.
      </Text>

      {/* --- Closing question --- */}
      <Text className="mb-[16px] text-[16px] font-bold leading-[24px] text-[#4A4A4A]">
        Last thing, and I read every reply:
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {formatLandForYou(chart)}&nbsp;Let me know because I&apos;m always
        improving.
      </Text>

      {/* --- Shadow-specific: closingLine --- */}
      {shadow && (
        <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
          {shadow.closingLine}
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
    typeButtonGif: 'https://livecorrectly.com/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34',
    topShadow: 'Willpower',
    hasChannelBridge: false,
    bridgeDescriptions: [],
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
  chartUrl: 'https://livecorrectly.com/see-your-design/test-id',
} satisfies Welcome0Props;

export default Welcome0;
