import * as React from 'react';
import { Text, Link } from 'react-email';
import { EmailLayout } from './components/email-layout';

interface ReengagementProps {
  preview: string;
  firstName: string;
  monthYear: string;
  monthsSinceSignup: number;
  chartUrl: string;
  unsubscribeUrl: string;
}

/**
 * Re-engagement broadcast email for pre-2026 subscribers.
 *
 * Acknowledges the silence after the welcome series under the old
 * "Fractal Human Design" brand, explains the rebrand to Live Correctly,
 * and offers a free 60-minute one-on-one session (5 spots) in exchange
 * for a case study (reconnect in 2 weeks). Also mentions the free
 * weekly "Decisions You Can Trust" group session.
 */
export const Reengagement = ({
  preview,
  firstName,
  monthYear,
  monthsSinceSignup,
  chartUrl,
  unsubscribeUrl,
}: ReengagementProps) => {
  return (
    <EmailLayout
      preview={preview}
      unsubscribeUrl={unsubscribeUrl}
      postscript={
        <Text className="mt-[24px] mb-[16px] text-[16px] italic leading-[24px] text-[#4A4A4A]">
          P.S. Here&apos;s the updated link for the chart, with a few things
          added:{' '}
          <Link href={chartUrl} className="text-[#6A4BD6] underline">
            view your chart
          </Link>
        </Text>
      }
    >
      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Hi {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        In {monthYear}, you got your chart at Fractal Human Design, and then
        five emails from me about how you&apos;re built: your type, how you make
        decisions, how to tell when you&apos;re on track.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And then I went quiet for {monthsSinceSignup} months. Sorry about that.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        At the end of that series I offered you a discounted session with me.
        Nobody took it&mdash;not you, not anyone. I had offerings listed on the
        old site too with a fancy way of clicking a button and buying, but no
        one ever did that either.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        In retrospect, it&apos;s obvious why: I was trying to initiate, but
        I&apos;m not an Initator. I&apos;m a Classic Builder, and what I&apos;m
        good at is building things, step-by-step. Building can take many forms,
        but for me it&apos;s about supporting my tribe (my #1 thematic is
        &quot;Support&quot;, and you can{' '}
        <Link href={chartUrl} className="text-[#6A4BD6] underline">
          see yours here
        </Link>
        ). And because you trusted me enough to share your birth information,
        you&apos;re part of my tribe.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        So, I&apos;ve rebuilt it all. I renamed the site to Live Correctly (stay
        tuned for what that means), and I&apos;ve flipped the script of how
        I&apos;m working with people. Rather than go through what your chart
        says, we discuss whatever you&apos;re actually dealing with, and how you
        can use your own wisdom to get the answers.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m looking for 5 people to do that with, at no charge.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Sixty minutes. You bring the situation, and I support you in
        understanding what to do about it, based on your specific design. In
        exchange: we talk again in 2 weeks and you tell me honestly what you did
        differently&mdash;including &ldquo;nothing&rdquo;&mdash;and if something
        shifted, you let me write it up. Anonymously if you&apos;d rather.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m building this practice and what I don&apos;t have yet is
        documented evidence of the impact. That&apos;s the trade.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Reply to this email if you want one of the spots.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If one-on-one is too much right now, I also run a free weekly session
        called <em>Decisions You Can Trust</em>: you bring something you could
        use support with, and we work on it together. You can see how each
        person is designed to use their own innate wisdom to navigate
        life&apos;s challenges. Reply and I&apos;ll send you that link instead.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And if you just want to read something from me every week, that works
        too. I&apos;ll share something new every week from now on.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">— Shawn</Text>
    </EmailLayout>
  );
};

Reengagement.PreviewProps = {
  preview: "Let's start over",
  firstName: 'Shawn',
  monthYear: 'October 2024',
  monthsSinceSignup: 22,
  chartUrl:
    'https://livecorrectly.com/see-your-design/test-id?utm_source=livecorrectly&utm_medium=email&utm_campaign=reengagement_2026',
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
} satisfies ReengagementProps;

export default Reengagement;
