import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Hr,
  Text,
  Link,
  Tailwind
} from 'react-email';
import { Signature } from './signature';

interface EmailLayoutProps {
  preview: string;
  unsubscribeUrl: string;
  children: React.ReactNode;
  postscripts?: React.ReactNode[];
}

/**
 * Generate postscript prefix: P.S., P.P.S., P.P.P.S., etc.
 */
function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

/**
 * Shared wrapper for all welcome emails.
 * Provides consistent structure: container, children slot, signature,
 * divider, and footer with physical address + unsubscribe link.
 *
 * No header image — skipped per plan (old FHD header doesn't apply;
 * Live Correctly branded header TBD).
 */
export function EmailLayout({
  preview,
  unsubscribeUrl,
  children,
  postscripts = []
}: EmailLayoutProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>{preview}</Preview>
        <Body className="bg-[#F6F3FC] font-sans">
          <Container className="mx-auto max-w-[600px] bg-white p-[32px]">
            {children}

            <Signature />

            {postscripts.map((content, index) => (
              <Text
                key={index}
                className="mt-[24px] mb-[16px] text-[16px] italic leading-[24px] text-[#4A4A4A]"
              >
                {getPostscriptPrefix(index)} {content}
              </Text>
            ))}

            <Hr className="my-[24px] border-[#E6E1F4]" />

            <Section>
              <Text className="m-0 text-[12px] leading-[18px] text-[#6E688A]">
                Live Correctly
                <br />
                5305 Indio Drive, Austin, TX 78745
              </Text>
              <Text className="mt-[8px] text-[12px] leading-[18px] text-[#6E688A]">
                <Link
                  href={unsubscribeUrl}
                  className="text-[#6E688A] underline"
                >
                  Unsubscribe
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
