import * as React from 'react';
import { Heading, Text, Section, Link, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { CareerTypeHighlight } from './components/career-type-table';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';

interface Welcome4Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 4: Key Indicators (Signature & Not-Self Themes)
 * Copy provided directly by Shawn — no HTML template file exists in the old repo.
 */
export const Welcome4 = ({ chart, unsubscribeUrl }: Welcome4Props) => {
  return (
    <EmailLayout
      preview={`Follow this advice for less ${chart.notSelfTheme} and more ${chart.signatureTheme}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h2"
        className="mt-[16px] text-[24px] font-bold tracking-tight text-[#221B3D]"
      >
        Success Code 4: Your Key Indicators
      </Heading>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        For many people, all this talk about decision making process can feel a
        bit ungrounded. How do you see progress? How do you know if these
        changes that you&apos;re making have an impact?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Thankfully, there&apos;s a simple way of knowing whether you are
        on-track or off-track. Look back at your day and notice if you have more{' '}
        {chart.notSelfTheme} than {chart.signatureTheme}.
      </Text>

      {/* 4a: Resistance indicator */}
      <CareerTypeHighlight
        number="4a"
        title="Resistance indicator"
        description={`You're off-track when feeling ${chart.notSelfTheme}.`}
      />

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        You might have had a lot of {chart.notSelfTheme} in your life. This is a
        sign that you are attempting to do something that{' '}
        <b>doesn&apos;t align with your core nature</b>. When you consistently
        do things that make you {chart.notSelfThemeAdjective}, you will find
        yourself increasingly drained of energy.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        When you find yourself {chart.notSelfThemeAdjective}, think about how
        you decided to do this activity: is it something that you thought you{' '}
        <i>should do</i>? Or is it something you actually wanted to do?
        Remember, making decisions from the head (typically &quot;I should&quot;
        language) is never the right way.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Interestingly, actively attempting to avoid being{' '}
        {chart.notSelfThemeAdjective} can itself cause it! When you think to
        yourself &quot;oh, I don&apos;t want to feel{' '}
        {chart.notSelfThemeAdjective}&quot; and so let me just avoid it all
        together, how do you feel? Probably even more{' '}
        {chart.notSelfThemeAdjective} than before! The only thing to do is to{' '}
        {chart.decisionMakingStrategy}.
      </Text>

      {/* 4b: Flow indicator */}
      <CareerTypeHighlight
        number="4b"
        title="Flow indicator"
        description={`You're on-track when feeling ${chart.signatureTheme}.`}
      />

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        On the other hand, when you feel {chart.signatureThemeAdjective}, you
        are doing something right. You likely feel in the flow, like things are
        going your way. Rather than focusing on money, fame, or power, look for
        feelings of {chart.signatureTheme} in your life. As you feel more{' '}
        {chart.signatureThemeAdjective} and less {chart.notSelfThemeAdjective},
        you&apos;ll find yourself moving more often with ease and joy.
      </Text>

      {/* Signature video link */}
      <Section className="mt-[8px]">
        <Link href={chart.signatureVideo}>
          <Img
            src={chart.typeButtonGif}
            height={180}
            width={320}
            alt={`Moving from ${chart.notSelfThemeAdjective} to ${chart.signatureThemeAdjective} video`}
          />
          <Text>
            Watch how to move from {chart.notSelfThemeAdjective} to{' '}
            {chart.signatureThemeAdjective} in this video.
          </Text>
        </Link>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If you can only remember one thing, this is it. By living life in this
        manner, you will{' '}
        <b>
          move from {chart.notSelfTheme} to {chart.signatureTheme}
        </b>
        . Look back at the things that cause you to get{' '}
        {chart.notSelfThemeAdjective}: did you {chart.innerAuthorityDescription}{' '}
        or did you make a decision based on what your mind thought you should do?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And that wraps up the teaching content for this series. Tomorrow
        we&apos;ll wrap things up with some final words of wisdom, and what are
        the next steps if you&apos;d like to consider the journey.
      </Text>
    </EmailLayout>
  );
};

Welcome4.PreviewProps = {
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
    hasChannelBridge: false,
    bridgeDescriptions: []
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test'
} satisfies Welcome4Props;

export default Welcome4;
