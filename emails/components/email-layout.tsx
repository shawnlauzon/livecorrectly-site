import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Img,
  Section,
  Hr,
  Text,
  Link,
  Tailwind,
} from 'react-email';
import { Signature } from './signature';

interface EmailLayoutProps {
  preview: string;
  /** Omit for transactional emails, which carry no unsubscribe link */
  unsubscribeUrl?: string;
  children: React.ReactNode;
  postscripts?: React.ReactNode[];
  /** Permission Slip logo at the top; off for transactional emails */
  showHeader?: boolean;
  /** Shawn's signature after the body; off for transactional emails */
  showSignature?: boolean;
  /** Divider + address/unsubscribe footer; off for transactional emails */
  showFooter?: boolean;
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
 * Header: Permission Slip logo at the top (omit with showHeader={false}).
 */
export function EmailLayout({
  preview,
  unsubscribeUrl,
  children,
  postscripts = [],
  showHeader = true,
  showSignature = true,
  showFooter = true,
}: EmailLayoutProps) {
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';

  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>{preview}</Preview>
        <Body className="bg-[#FAF8F4] font-sans">
          <Container className="mx-auto max-w-[660px] bg-white px-[24px] py-[32px]">
            {showHeader && (
              <Img
                src={`${appUrl}/newsletter/permission-slip.png`}
                alt="Permission Slip"
                width={600}
                className="mx-auto mb-[24px]"
              />
            )}
            {children}

            {showSignature && <Signature />}

            {postscripts.map((content, index) => (
              <Text
                key={index}
                className="mt-[24px] mb-[16px] text-[16px] italic leading-[24px] text-[#45585B]"
              >
                {getPostscriptPrefix(index)} {content}
              </Text>
            ))}

            {showFooter && (
              <>
                <Hr className="my-[24px] border-[#C9C2B4]" />

                <Section>
                  <Text className="m-0 text-[12px] leading-[18px] text-[#45585B]">
                    Live Correctly
                    <br />
                    5305 Indio Drive, Austin, TX 78745
                  </Text>
                  {unsubscribeUrl && (
                    <Text className="mt-[8px] text-[12px] leading-[18px] text-[#45585B]">
                      <Link
                        href={unsubscribeUrl}
                        className="text-[#45585B] underline"
                      >
                        Unsubscribe
                      </Link>
                    </Text>
                  )}
                </Section>
              </>
            )}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
