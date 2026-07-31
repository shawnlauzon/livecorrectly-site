import * as React from 'react';
import { Img, Text, Section, Row, Column } from 'react-email';

/**
 * Blockquote with Ra Uru Hu headshot and attribution.
 * Used in welcome1 and welcome2 for founder quotes.
 */
export function RaQuote({ children }: { children: React.ReactNode }) {
  return (
    <Section className="ml-[32px] mt-[8px]">
      <Text className="font-serif text-[16px] leading-[24px] text-brown-900 italic">
        &ldquo;{children}&rdquo;
      </Text>
      <Row className="mt-[5px]">
        <Column className="w-[64px]">
          <Img
            alt="Ra Uru Hu headshot"
            src="https://fractalhumandesign.s3.amazonaws.com/site/images/ra-uru-hu-headshot.jpg"
            width={48}
            height={48}
            className="rounded-full"
          />
        </Column>
        <Column className="align-top">
          <Text className="m-0 text-[14px] font-medium leading-[20px] text-stone-800">
            Ra Uru Hu
          </Text>
          <Text className="m-0 text-[12px] font-medium leading-[14px] text-brown-700">
            Human Design Founder
          </Text>
        </Column>
      </Row>
    </Section>
  );
}
