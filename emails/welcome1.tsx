import * as React from 'react';
import { Heading, Text } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import {
  misfitAdvice,
  typeEngagement,
  waitingDetail,
  waitingSpeedNote,
  lookupByCareerType,
} from './content';

interface Welcome1Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 1: "The advice that was never for you"
 *
 * Introduces the person's career type and strategy through a narrative
 * "the advice wasn't for you" frame. Blends what was previously split
 * across welcome1 (career type) and welcome2 (strategy).
 *
 * All conditionals use BG5 career types (chart.careerDesign), not HD types.
 */
export const Welcome1 = ({
  firstName,
  chart,
  unsubscribeUrl,
}: Welcome1Props) => {
  const advice = lookupByCareerType(misfitAdvice, chart.careerDesign);
  const engagement = lookupByCareerType(typeEngagement, chart.careerDesign);
  const detail = lookupByCareerType(waitingDetail, chart.careerDesign);
  const speedNote = lookupByCareerType(waitingSpeedNote, chart.careerDesign);

  return (
    <EmailLayout
      preview="It's good advice. It's just not yours."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        I'm sure that at some point, somebody has told you to {advice}.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Maybe a coach, maybe a book, maybe your best friend&apos;s plumber. You
        tried. It worked for a while and then it didn&apos;t, and you added it
        to the list of things you started and couldn&apos;t sustain.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Here&apos;s the thing about that advice: it&apos;s good. Whoever gave it
        to you built something that worked, then described what they did. What
        they described was how they engage with the world.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        The problem is you&apos;re not them. And what is good for the goose, is
        often NOT what&apos;s good for the gander. (A goose is actually a male
        gander. I had to look that up.)
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        You&apos;re a {chart.careerDesign} &mdash; in Human Design terms, a{' '}
        {chart.type}.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {engagement}
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        So the version that works for you is <strong>{chart.strategy}</strong>.
      </Text>

      {chart.careerDesign !== 'Initiator' ? (
        <>
          <Heading
            as="h2"
            className="mt-[24px] mb-[8px] text-[20px] font-bold text-[#221B3D]"
          >
            Waiting isn&apos;t what it sounds like
          </Heading>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            I know how that lands. You&apos;ve spent years being told the people
            who make it are the ones who push, and now here&apos;s a stranger
            telling you to wait.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            So let me be specific about what it isn&apos;t. It isn&apos;t
            sitting still. It isn&apos;t hoping. It isn&apos;t turning down
            work.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {detail}
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            And you already have the evidence for this, because you&apos;ve run
            the experiment.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            Think about the things you started cold, because you&apos;d decided
            they were a good idea. Then think about the ones that arrived
            &mdash; someone asked, something came up, and you knew almost
            immediately. Compare how those two sets went.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {speedNote}
          </Text>
        </>
      ) : (
        <>
          {/* Initiator: entirely custom section (Shawn provides alt copy via waitingDetail/waitingSpeedNote maps) */}
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {detail}
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {speedNote}
          </Text>
        </>
      )}

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        One question:
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        What&apos;s the piece of advice you keep getting handed that you
        can&apos;t make yourself do? I&apos;m collecting these &mdash; hit reply
        and tell me yours.
      </Text>
    </EmailLayout>
  );
};

// Preview props for React Email dev server
Welcome1.PreviewProps = {
  firstName: 'Shawn',
  chart: {
    type: 'Generator',
    isGenerator: true,
    isPureGenerator: true,
    isManifestingGenerator: false,
    isManifestor: false,
    isProjector: false,
    isReflector: false,
    careerDesign: 'Classic Builder',
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
    bridgeDescriptions: [],
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
} satisfies Welcome1Props;

export default Welcome1;
