import * as React from 'react';
import { Text, Link } from 'react-email';
import { EmailLayout } from './components/email-layout';

interface RestartNoticeProps {
  firstName: string;
  month: string;
  unsubscribeUrl: string;
}

/**
 * Restart notice broadcast email for subscribers stuck at next_step = 0.
 *
 * These subscribers signed up and saw their chart but never received the
 * welcome email series because the automation was broken. This one-time
 * broadcast explains what happened and sets expectations for the upcoming
 * welcome series (starting 2 days after this email).
 */
export const RestartNotice = ({
  firstName,
  month,
  unsubscribeUrl,
}: RestartNoticeProps) => {
  return (
    <EmailLayout
      preview="There was supposed to be more after it."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Hi {firstName},
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        In {month} you got your Human Design chart at Fractal Human Design. A
        series of emails was supposed to follow it. Unfortunately my automation
        was broken and it never sent.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        But it&apos;s being fixed this week! I&apos;ll be sending four emails
        over four days about what your chart means for how you work and how you
        decide, then something once a week after that.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        I&apos;ve also renamed to Live Correctly, which is why the email is a
        bit different.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        If you&apos;d rather not receive anything, hit{' '}
        <Link href={unsubscribeUrl} className="text-[#6A4BD6] underline">
          unsubscribe
        </Link>{' '}
        below. No hard feelings.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        &mdash; Shawn
      </Text>
    </EmailLayout>
  );
};

RestartNotice.PreviewProps = {
  firstName: 'Shawn',
  month: 'March',
  unsubscribeUrl: 'https://www.livecorrectly.com/api/unsubscribe?token=test',
} satisfies RestartNoticeProps;

export default RestartNotice;
