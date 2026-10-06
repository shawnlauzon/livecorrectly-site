import * as React from 'react';
import { Html, Head, Preview, Body, Container, Tailwind, Text, Section, Button, Link } from 'react-email';

export const subject = 'Your Live Correctly link';
export const preview = 'Your chart and your personalized newsletter.';

interface ChartLinkProps {
  firstName: string;
  /** Personalized newsletter link (sets the remember-me cookie on arrival) */
  newsletterUrl: string;
  chartUrl: string;
}

/**
 * Sent on request ("Already have a chart? Email me my link") so a returning
 * subscriber on a new device can get back to their personalized pages.
 *
 * Transactional, so it skips EmailLayout: no header graphic, signature,
 * address footer, or unsubscribe link — just a plain white note.
 */
export const ChartLink = ({
  firstName,
  newsletterUrl,
  chartUrl,
}: ChartLinkProps) => (
  <Tailwind>
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body className="bg-white font-sans">
        <Container className="mx-auto max-w-[660px] px-[24px] py-[32px]">
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#45585B]">
            {firstName},
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#45585B]">
            Here&apos;s your link. Open it on this device and the newsletter will be
            personalized to your design from now on.
          </Text>

          <Section className="mb-[24px] text-center">
            <Button
              href={newsletterUrl}
              className="rounded-[8px] bg-[#158377] px-[24px] py-[12px] text-[16px] font-semibold text-white"
            >
              Read it personalized for you →
            </Button>
          </Section>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#45585B]">
            Your full chart is here too:{' '}
            <Link href={chartUrl} className="text-[#158377] underline">
              see how you&apos;re designed
            </Link>
            .
          </Text>

          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#45585B]">
            If you didn&apos;t ask for this, you can ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

ChartLink.PreviewProps = {
  firstName: 'Shawn',
  newsletterUrl: 'https://www.livecorrectly.com/newsletter?s=00000000-0000-0000-0000-000000000000',
  chartUrl: 'https://www.livecorrectly.com/see-your-design/00000000-0000-0000-0000-000000000000',
} satisfies ChartLinkProps;

export default ChartLink;
