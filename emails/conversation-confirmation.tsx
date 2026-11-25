import * as React from 'react';
import { Html, Head, Preview, Body, Container, Tailwind, Text, Link } from 'react-email';
import { EMAIL_BODY_FONT } from '../lib/email/fonts';
import { EMAIL_COLORS } from '../lib/email/colors';

export const subject = 'Pick a time for our conversation';
export const preview = 'Your guide is on its way. Book whenever it suits you.';

interface ConversationConfirmationProps {
  firstName: string;
  scheduleUrl: string;
}

/**
 * Sent once to someone who paid for a conversation (a pay-first offer), so they
 * can book whenever it suits them. Replies go to Shawn.
 *
 * Transactional, so it skips EmailLayout: no header graphic, address footer,
 * or unsubscribe link — just a plain white note.
 */
export const ConversationConfirmation = ({ firstName, scheduleUrl }: ConversationConfirmationProps) => {
  const text = { color: EMAIL_COLORS.inkSoft };
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>{preview}</Preview>
        <Body className="bg-white" style={{ fontFamily: EMAIL_BODY_FONT }}>
          <Container className="mx-auto max-w-[660px] px-[24px] py-[32px]">
            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              {firstName},
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              Thank you for booking a conversation with me.
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              I’ll start with your personalized guide to living correctly. It will
              arrive at this email address within 24 hours.
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              Pick a time for our conversation whenever it suits you:{' '}
              <Link href={scheduleUrl} style={{ color: EMAIL_COLORS.action, textDecoration: 'underline' }}>
                Pick your time
              </Link>
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              If you have a question in the meantime, reply to this email.
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              &mdash;Shawn
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

ConversationConfirmation.PreviewProps = {
  firstName: 'Shawn',
  scheduleUrl: 'https://calendar.app.google/example',
} satisfies ConversationConfirmationProps;

export default ConversationConfirmation;
