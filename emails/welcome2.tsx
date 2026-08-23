import * as React from 'react';
import { Text } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { formatOftenPrompt } from './content';

interface Welcome2Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 2: Signpost email (signature / not-self as daily check-in)
 */
export const Welcome2 = ({
  firstName,
  chart,
  unsubscribeUrl,
}: Welcome2Props) => {
  return (
    <EmailLayout
      preview="A test you can run in ten seconds."
      unsubscribeUrl={unsubscribeUrl}
      postscripts={[
        <>
          {formatOftenPrompt(`feel ${chart.notSelfThemeAdjective}`, chart)} Hit
          reply and let me know.
        </>,
      ]}
    >
      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Hey {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Short one today.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Yesterday was a lot of information. Today I want to share something you
        can use immediately: a simple way to get a sense of how things are
        going. I use it all the time to see if I&apos;m in the flow.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Look back at yesterday. Were you mostly {chart.notSelfThemeAdjective},
        or mostly {chart.signatureThemeAdjective}?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Those two feelings are your signposts. One means you&apos;re working
        against how you&apos;re built. The other means you&apos;re working with
        it. The more you&apos;re feeling {chart.signatureThemeAdjective}, the
        more you&apos;re in the flow.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        This might feel like a weird way of tracking things. Most advice tracks
        things like <em>tasks achieved</em>
        or <em>dollars earned</em>. And yes, they&apos;re better than nothing.
        But look back and consider days that you achieved some of this, but all
        day you felt {chart.notSelfThemeAdjective}&mdash;is this a life of flow?
        Could you do that every day?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Now think back to a day where you didn&apos;t earn any money, you
        weren&apos;t on vacation, but still you felt incredibly{' '}
        {chart.signatureThemeAdjective}. If every day was like that,
        wouldn&apos;t you have the life that you wanted?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        It&apos;s important that you don&apos;t try to <em>avoid</em>{' '}
        {chart.notSelfTheme}. Instead, simply recognize when you&apos;re feeling
        it, and if you do, PAUSE. Think back to when you decided to do whatever
        you&apos;re doing. Did you follow your decision making strategy? Or did
        your mind tell you that you <em>should</em> do something without
        listening to your body? Probably it was your mind. And so now try again,
        but this time {chart.innerAuthorityDescription}.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Every day, look for what brings you {chart.signatureTheme}. You&apos;re
        designed for it.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">&mdash;Shawn</Text>
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
    typeButtonGif: 'https://livecorrectly.com/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34',
    topShadow: 'Willpower',
    hasChannelBridge: false,
    bridgeDescriptions: [],
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
} satisfies Welcome2Props;

export default Welcome2;
