import * as React from 'react';
import { Heading, Text, Section, Link, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { RaQuote } from './components/ra-quote';
import { CareerTypeHighlight } from './components/career-type-table';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { strategyWriteups } from '../lib/email-content';

interface Welcome2Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 2: Personal Interaction Style (Strategy)
 * Ported from fractalhumandesign/email/templates/welcome2.html
 * Copy is verbatim from the original template.
 */
export const Welcome2 = ({ chart, unsubscribeUrl }: Welcome2Props) => {
  const strategyWriteup = strategyWriteups.get(chart.strategy) ?? '';

  return (
    <EmailLayout
      preview={`You are designed to ${chart.strategy}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h2"
        className="mt-[16px] text-[24px] font-bold tracking-tight text-[#221B3D]"
      >
        Success Code 2: Personal Interaction Style
      </Heading>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Each of the types has a different way of moving though life. Living
        according to your design means to stop trying to make things happen from
        the <em>mind</em> (&quot;I should ...&quot;), and instead allow the
        unique wisdom of the <em>body</em> to guide you in daily activities.
      </Text>

      <CareerTypeHighlight
        number="2"
        title="Personal Interaction Style"
        description={`Your personal style is to ${chart.strategy}.`}
      />

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        {strategyWriteup}
      </Text>

      {/* Waiting section — shown for all types except Manifestor */}
      {!chart.isManifestor && (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px]">
            You&apos;re probably not used to so much waiting. You might even feel
            that if you&apos;re not actively doing something, you&apos;re
            falling behind. Or maybe even feel like you&apos;re being lazy! But
            waiting is not just sitting around, waiting for something to happen.
            It&apos;s an active state of awareness. Rather than running around
            and DOING, it&apos;s more of a state of BEING. And then doing what
            you want, what makes you happy, or even something which brings you{' '}
            {chart.signatureTheme}.
          </Text>

          <RaQuote>
            So many people think that waiting is a stagnant sort of dead space.
            You know, nothing is happening, nothing is going on, nothing&apos;s
            ever going on ... It doesn&apos;t mean that nothing is going on.
            Waiting can be translated as a higher state of alertness ... It is a
            state of awareness. It is being present. It is being ready for
            precisely those things that you&apos;re actually waiting for, waiting
            for that perfect stimulation that is going to allow you to operate
            correctly, to make a decision correctly, because you&apos;re present
            here now, waiting you.
          </RaQuote>
        </>
      )}

      {/* Strategy video link */}
      <Section className="mt-[8px]">
        <Link href={chart.strategyVideo}>
          <Img
            src={chart.typeButtonGif}
            height={180}
            width={320}
            alt={`How to ${chart.strategy} video`}
          />
          <Text>Watch how to {chart.strategy} in this video.</Text>
        </Link>
      </Section>

      {/* Strategy writeup repeated (matches original template) */}
      <Text className="mb-[16px] text-[16px] leading-[24px]">
        {strategyWriteup}
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        After you {chart.strategy}, you still need to determine if this is
        something to take action on. That&apos;s next.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        That&apos;ll do it for the first part of the decision-making strategy.
        Tomorrow we&apos;ll cover the second part, which is how to know if you
        should take action on something. See you then!
      </Text>
    </EmailLayout>
  );
};

Welcome2.PreviewProps = {
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
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test'
} satisfies Welcome2Props;

export default Welcome2;
