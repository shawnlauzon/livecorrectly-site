import * as React from 'react';
import { Text } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';

interface Welcome3Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 3: Invitation — one-on-one offer and Decisions You Can Trust
 *
 * Conversational close that recaps what the subscriber has learned,
 * acknowledges the limits of template-based advice, and offers a
 * free one-on-one session in exchange for a documented case study.
 * CTA is "reply to this email."
 */
export const Welcome3 = ({
  firstName,
  chart,
  unsubscribeUrl,
}: Welcome3Props) => {
  const authority =
    chart.innerAuthority === 'None'
      ? 'Lunar Authority'
      : `${chart.innerAuthority} Authority`;

  return (
    <EmailLayout
      preview="Being honest about the limit."
      unsubscribeUrl={unsubscribeUrl}
      postscripts={[
        <>
          If you&apos;re not sure whether you&apos;ve got something worth
          bringing: you do. Bring the decision you&apos;ve been putting off.
          That&apos;s the one.
        </>,
      ]}
    >
      <Text className="mb-[16px] text-[16px] leading-[24px]">{firstName},</Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Three emails in, let&apos;s review where we&apos;re at.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        You know what you&apos;re built to do and why the standard advice
        hasn&apos;t worked. You know what{' '}
        {chart.isManifestor ? 'informing' : 'waiting'}&nbsp;actually means,
        which is the part almost everyone gets wrong. And you&apos;ve got your
        signposts&mdash;{chart.notSelfTheme} and {chart.signatureTheme}
        &mdash;which you can use to keep yourself on track.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        That&apos;s real value. In fact, it&apos;s the whole thing. Live your
        life by it, and you&apos;ll see your life radically transformed.
        Guaranteed.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        But I want to be straight with you about what it takes. It&apos;ll take
        time to learn how to apply it to the situations in your life.
        Definitely, start experimenting with it right away. But if you have
        anything you&apos;re struggling with now, and want to apply this
        knowledge quicker, let&apos;s chat.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        (By the way, if you&apos;re considering using AI to help with this,
        there is a place for it. I actually use it to get things from time to
        time. But I have seen that a huge chunk of it is straight up WRONG.
        Which is ok for me, because I already know what parts are accurate. But
        without years of training, certified by a real institution and not a
        weekend course, it&apos;s really easy to be led down the wrong path. And
        I don&apos;t want that for you.)
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        <strong>An offer, and a trade</strong>
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        So, here&apos;s where I&apos;m at: I&apos;m looking for 5 people to work
        with one-on-one, at no charge.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Sixty minutes, on whatever&apos;s actually keeping you up at night. You
        bring the situation; I show you what your design says about it. We will
        look through your chart, but this is not a &ldquo;reading&rdquo;; this
        is problem solving.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Here&apos;s what I ask in return:
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m building this practice, and what I don&apos;t have yet is
        documented results. So the trade is: we talk now, and then we talk again
        in 2 weeks, and you tell me honestly what you did
        differently&mdash;including <em>nothing</em>. If something did shift,
        I&apos;d want your permission to write it up. Anonymously if you&apos;d
        prefer.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        That&apos;s the whole deal. You get the session; I get to find out
        whether it works and to say so publicly.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m building this practice and what I don&apos;t have yet is
        documented evidence of the impact. That&apos;s the trade.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Reply to this email if you want one of the 5 spots.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If that&apos;s not for you, the weekly <em>Decisions You Can Trust</em>{' '}
        session I mentioned previously is still running and always free. Reply
        and I&apos;ll send you the link for that instead.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Either way, you&apos;ve got your decision making strategy and your
        signposts, and those work whether or not we ever talk.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">— Shawn</Text>
    </EmailLayout>
  );
};

Welcome3.PreviewProps = {
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
      'https://livecorrectly.com/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34',
    topShadow: 'Willpower',
    hasChannelBridge: false,
    bridgeDescriptions: [],
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
} satisfies Welcome3Props;

export default Welcome3;
