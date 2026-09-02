import * as React from 'react';
import { Text } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { PullQuote } from './components/pull-quote';
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
  return (
    <EmailLayout
      preview="Being honest about the limit."
      unsubscribeUrl={unsubscribeUrl}
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
        <strong>Five spots, $50</strong>
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I just wrapped up a handful of these sessions for free, to make sure
        they actually work before I charged for anything. They did. Here&apos;s
        what one client said:
      </Text>

      <PullQuote>
        Working with Shawn has been a wonderful experience. He helped me
        figure out where I was and wasn&apos;t supposed to be putting my
        energy. Doing this unlocked so much creative potential for me. People
        take supplements for bio-hacking, but I think this is the real
        bio-hacking.
      </PullQuote>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        So I&apos;ve opened up five more at a $50 introductory rate.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        We&apos;ll meet online or in person for 90 minutes. You bring whatever
        you&apos;re struggling with today: it could be something with your
        career, or something more personal. We discuss, and I support you to
        discover the answers that you already have within you but don&apos;t
        know how to access.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        <b>But wait, there&apos;s more!</b>&nbsp;Before the session, I&apos;ll
        send you a personalized guide that I create by hand. It&apos;ll give
        more detail about the things contained in the emails, as well as parts
        not even touched on like your ideal work environments and how you best
        interact with others. You&apos;ll receive it before the session so that
        you can ask any questions, or simply have it ready for any future
        challenges.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If you want one of the five, just reply to this email with any questions
        you have, and I&apos;ll do my best to answer them. Or if you&apos;d
        rather skip straight to it,{' '}
        <a href="https://calendar.app.google/YKfU8X1PdH5X3EJi6">
          you can book here
        </a>
        .
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And if now&apos;s not the right time, no problem at all. You&apos;ve got
        your strategy and your signposts, and that might be all you need for
        right now. If you find yourself needing something more in the future,
        I&apos;ll be here.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        With love,
        <br />
        Shawn
      </Text>
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
    typeButtonGif: 'https://livecorrectly.com/generator-button.gif',
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
