import * as React from 'react';
import { Text, Link } from 'react-email';
import { EmailLayout } from './components/email-layout';

interface ReengagementProps {
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
  firstName,
  monthYear,
  monthsSinceSignup,
  chartUrl,
  unsubscribeUrl,
}: ReengagementProps) => {
  return (
    <EmailLayout
      preview="Being direct about what I should have offered last year."
      unsubscribeUrl={unsubscribeUrl}
      postscript={
        <Text className="mt-[24px] mb-[16px] text-[16px] italic leading-[24px] text-[#4A4A4A]">
          P.S. If you&apos;re not sure whether you&apos;ve got something worth
          bringing: you do. Bring the decision you&apos;ve been putting off.
          That&apos;s the one.
        </Text>
      }
    >
      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Hi {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        In {monthYear} you got your chart at Fractal Human Design, and then five
        emails from me about how you&apos;re built &mdash; your type, how you
        make decisions, how to tell when you&apos;re on track.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And then I went quiet for {monthsSinceSignup} months. Sorry about that.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Here&apos;s what I didn&apos;t do at the time: actually offer you
        anything. The series ended with a vague &ldquo;book a
        conversation&rdquo; link that I don&apos;t think a single person
        clicked, and I don&apos;t blame them. It wasn&apos;t clear what it was
        for.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        So let me be direct about it now.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Since then I&apos;ve rebuilt all of this &mdash; it&apos;s called Live
        Correctly, and I&apos;ve been working with people one-on-one on what
        their design says about whatever they&apos;re actually dealing with. Not
        a tour of their chart. A real decision, a stuck situation, a person they
        can&apos;t reach.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m looking for 5 people to do that with, at no charge.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Sixty minutes. You bring the situation, I tell you what your design says
        about it. In exchange: we talk again in 2 weeks and you tell me honestly
        what you did differently&mdash;including &ldquo;nothing&rdquo;&mdash;and
        if something shifted, you let me write it up. Anonymously if you&apos;d
        rather.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;m building this practice and what I don&apos;t have yet is
        documented evidence of the impact. That&apos;s the trade.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Reply to this email if you want one of the spots.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If one-on-one is more than you&apos;re after, I also run a free weekly
        session called <em>Decisions You Can Trust</em>&mdash;you bring
        something you&apos;re deciding and we work on it in a group. Reply and
        I&apos;ll send you that link instead.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        And here&apos;s the updated link for the chart, with a few things added:{' '}
        <Link href={chartUrl} className="text-[#6A4BD6] underline">
          view your chart
        </Link>
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">— Shawn</Text>
    </EmailLayout>
  );
};

Reengagement.PreviewProps = {
  firstName: 'Shawn',
  monthYear: 'October 2024',
  monthsSinceSignup: 22,
  chartUrl:
    'https://livecorrectly.com/see-your-design/test-id?utm_source=livecorrectly&utm_medium=email&utm_campaign=reengagement_2026',
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
} satisfies ReengagementProps;

export default Reengagement;
