import * as React from 'react';
import { Html, Head, Preview, Body, Container, Tailwind, Text } from 'react-email';
import { EMAIL_BODY_FONT } from '../lib/email/fonts';
import { EMAIL_COLORS } from '../lib/email/colors';

export const subject = 'Your personalized guide: what happens next';
export const preview = 'It can take up to 24 hours to arrive.';

interface GuideConfirmationProps {
  firstName: string;
}

/**
 * Sent once to someone who bought the personalized guide, so they know it's
 * coming and when. Replies go to Shawn.
 *
 * Transactional, so it skips EmailLayout: no header graphic, address footer,
 * or unsubscribe link — just a plain white note.
 */
export const GuideConfirmation = ({ firstName }: GuideConfirmationProps) => {
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
              Thank you for buying your personalized guide.
            </Text>

            <Text className="mb-[16px] text-[16px] leading-[24px]" style={text}>
              I put each one together myself, so it can take up to 24 hours to
              send it. It will arrive at this email address.
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

GuideConfirmation.PreviewProps = {
  firstName: 'Shawn',
} satisfies GuideConfirmationProps;

export default GuideConfirmation;
