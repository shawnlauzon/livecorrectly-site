import * as React from 'react';
import { Heading, Text } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import {
  typeEngagement,
  waitingDetail,
  lookupByCareerType,
  lookupByDMS,
  formatPrompt,
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

const getArticle = (word: string): string => {
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  return vowels.includes(word[0].toUpperCase()) ? 'an' : 'a';
};

export const Welcome1 = ({
  firstName,
  chart,
  unsubscribeUrl,
}: Welcome1Props) => {
  const engagement = lookupByDMS(
    typeEngagement,
    chart.careerDesign,
    chart.innerAuthority,
  );
  const detail = lookupByDMS(
    waitingDetail,
    chart.careerDesign,
    chart.innerAuthority,
  );

  return (
    <EmailLayout
      preview="It's good advice. It's just not yours."
      unsubscribeUrl={unsubscribeUrl}
      postscript={
        <Text className="mt-[24px] mb-[16px] text-[16px] italic leading-[24px] text-[#4A4A4A]">
          P.S.{' '}
          {formatPrompt(
            "followed someone's advice which works for them, but didn't work for you",
            chart,
          )}{' '}
          Hit reply and let me know.
        </Text>
      }
    >
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        If you&apos;re anything like me, at some point somebody has given you
        some advice: told you to put yourself out there and just share what you
        know. Or be more consistent. Or speak up more in meetings.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Maybe a coach, maybe a book, maybe your best friend&apos;s plumber. You
        didn&apos;t trust yourself, so you tried. And it worked for awhile, but
        then something happened to bring you off-track. And you added it to the
        list of things that you&apos;re a failure at.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Here&apos;s the thing about that advice: it&apos;s good&mdash;for the
        right person. In fact, the advice was perfect for the person who gave
        it.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Unfortunately, even though anyone <em>can</em> do anything, it
        doesn&apos;t mean that everyone <em>should</em>. You would have to go
        through a ton of {chart.notSelfTheme} before achieving what you thought
        you wanted if you depended on advice not for you.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {engagement}
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        That&apos;s because your design is {getArticle(chart.careerDesign)}{' '}
        {chart.careerDesign}&mdash;in Human Design terms,{' '}
        {getArticle(chart.type)} {chart.type}. And your decision making strategy
        is to <strong>{chart.decisionMakingStrategy}</strong>.
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
            who make it are the ones who go out and make things happen, and now
            here&apos;s a stranger telling you to wait.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            So let me be specific about what it isn&apos;t. It isn&apos;t
            sitting still. It isn&apos;t doing nothing. It is, rather, actively
            positioning yourself to receive.
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {detail}
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            This is not to say you should <em>avoid</em> doing anything
            that you have energy for. If you have an authentic desire to do
            something&mdash;and it&apos;s not your mind telling you that you
            should do to get some result&mdash;definitely do it!
          </Text>
        </>
      ) : (
        <>
          {/* Initiator: entirely custom section (Shawn provides alt copy via waitingDetail/waitingSpeedNote maps) */}
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            {detail}
          </Text>
        </>
      )}

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Knowing how to use and trust your decision making strategy is the single
        most important thing you can learn. The shadow mentioned in the previous
        email, as well as all the rest, can be softened by making decisions that
        are correct for you. There&apos;s a reason the site is{' '}
        <em>
          <strong>Live Correctly</strong>
        </em>
        : when you live by your decision making strategy, you are by definition
        living correctly, specifically for you.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Living correctly is simple, but it takes practice. That&apos;s why I
        hold a free <em>Decisions You Can Trust</em> online session every week.
        Reply to this email and I&apos;ll send you the link.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {chart.innerAuthorityDescription.charAt(0).toUpperCase() +
          chart.innerAuthorityDescription.slice(1)}
        .
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
