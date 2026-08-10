import * as React from 'react';
import { Img, Text, Section, Row, Column } from 'react-email';

/**
 * Shawn's email signature block.
 * Ported from fractalhumandesign email signature component.
 */
export function Signature() {
  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  return (
    <Section className="mt-[24px]">
      <Row>
        <Column className="w-[64px] align-top">
          <Img
            alt="Shawn Lauzon headshot"
            src={`${appUrl}/shawn-lauzon-headshot.jpg`}
            width={48}
            height={48}
            className="rounded-full"
          />
        </Column>
        <Column className="align-top">
          <Text className="m-0 text-[14px] font-semibold leading-[20px] text-stone-800">
            Shawn Lauzon
          </Text>
          <Text className="m-0 text-[12px] leading-[16px] text-stone-500">
            Certified Human Design for Business
            <br />
            BG5 Career &amp; Business Consultant
          </Text>
        </Column>
      </Row>
    </Section>
  );
}
