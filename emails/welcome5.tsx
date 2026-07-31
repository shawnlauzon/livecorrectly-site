import * as React from 'react';
import { Heading, Text, Section, Link, Img, Button, Row, Column } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { sleepAloneProjectors } from '../lib/hd-chart/constants';

interface Welcome5Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
  bookingUrl: string;
}

/**
 * Welcome Email 5: Conclusion + CTA
 * Ported from fractalhumandesign/email/templates/welcome5.html.
 * Teaching content is verbatim; CTA section replaces old Stripe promo
 * with a single "Book a conversation" button per plan.
 */
export const Welcome5 = ({
  firstName,
  chart,
  unsubscribeUrl,
  bookingUrl
}: Welcome5Props) => {
  return (
    <EmailLayout
      preview={`Congratulations ${firstName} on entering your life of flow`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h2"
        className="mt-[16px] text-[24px] font-bold tracking-tight text-[#221B3D]"
      >
        In conclusion
      </Heading>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        We&apos;ve gone through a bunch of stuff. Boiling it all down to a
        single statement gives us this:
      </Text>

      {/* Bumper sticker */}
      <Section>
        <Row>
          <Column className="w-[48px] align-baseline">
            <Img
              alt="rocket icon"
              height={48}
              src="https://react.email/static/rocket-icon.png"
              width={48}
            />
          </Column>
          <Column className="w-[85%]">
            <Text className="m-0 text-[20px] font-serif leading-[28px] text-[#221B3D]">
              On a bumper sticker
            </Text>
            <Text className="m-0 mt-[8px] text-[16px] leading-[24px] text-[#4A4A4A]">
              Pause - observe - {chart.decisionMakingStrategy}. This brings more{' '}
              {chart.signatureTheme} and less {chart.notSelfTheme}.
            </Text>
          </Column>
        </Row>
      </Section>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        Simple, but not always easy. It takes a lifetime to fully integrate this
        into your way of being. The effort is totally worth it! You&apos;ll find
        yourself moving through life with more ease and flow, and less
        resistance.
      </Text>

      {/* Fair selection comic */}
      <Section className="w-[85%]">
        <Img
          src="https://fractalhumandesign.s3.amazonaws.com/site/images/comic-fair-selection.png"
          alt="Fair selection test"
          width={563}
          height={393}
          className="w-full rounded-xl"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '100%'
          }}
        />
        <Text className="mt-[16px] text-[14px] leading-[24px]">
          What happens when we all try to play by the same rules.
        </Text>
      </Section>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        You have the strengths needed to be successful. Your strengths are
        different from other people&apos;s, and so it can be easy to compare
        with others and want what they have. But Human Design shows us how we
        are unique and that there&apos;s absolutely no point comparing yourself
        to anyone else. It&apos;s like comparing yourself to a cheetah:
        it&apos;s not your fault that you can&apos;t run as fast.
      </Text>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        Human Design teaches that in order to release accumulated energy, people
        should sleep alone. This is especially true for non-energy types, but
        applies to all types. Check out this video for more information.
      </Text>

      {/* Sleep alone video */}
      <Section className="mt-[8px]">
        <Link href={sleepAloneProjectors}>
          <Img
            src={chart.typeButtonGif}
            height={180}
            width={320}
            alt="Sleep alone video"
          />
          <Text>Click to view.</Text>
        </Link>
      </Section>

      {/* CTA section — replaces old Stripe promo cards */}
      <Heading
        as="h3"
        className="mt-[16px] text-[24px] font-bold tracking-tight text-[#221B3D]"
      >
        What&apos;s next?
      </Heading>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        You could continue to experiment on your own; that&apos;s the purpose of
        this mini-course! However, some people get massive value by hearing it
        directly from someone who has been practicing it for years.
      </Text>

      <Text className="mt-[8px] text-[16px] leading-[24px]">
        If you&apos;d like to go deeper into your design and understand how to
        apply it to your business and career, I&apos;d love to have a
        conversation with you. No pressure, no pitch — just an honest
        exploration of whether working together makes sense for both of us.
      </Text>

      <Section className="mt-[24px] text-center">
        <Button
          href={bookingUrl}
          className="rounded-[8px] bg-[#6A4BD6] px-[24px] py-[12px] text-[16px] font-semibold text-white"
        >
          Book a conversation
        </Button>
      </Section>

      <Text className="mt-[24px] text-[16px] leading-[24px]">
        Looking forward to guiding you in a life of more magic and flow.
      </Text>
    </EmailLayout>
  );
};

Welcome5.PreviewProps = {
  firstName: 'Shawn',
  chart: {
    type: 'Generator',
    isGenerator: true,
    isPureGenerator: true,
    isManifestingGenerator: false,
    isManifestor: false,
    isProjector: false,
    isReflector: false,
    careerDesign: '🔥 Classic Builder',
    strategy: 'wait to respond before engaging',
    innerAuthority: 'Emotional',
    innerAuthorityDescription: 'wait for emotional clarity',
    signatureTheme: 'satisfaction',
    notSelfTheme: 'frustration',
    signatureThemeAdjective: 'satisfied',
    notSelfThemeAdjective: 'frustrated',
    decisionMakingStrategy:
      'wait to respond before engaging, and then wait for emotional clarity',
    isEmotionalAuthority: true,
    typeVideo: 'https://youtu.be/9PVgkBzpPqs',
    typeButtonGif:
      'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34'
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test',
  bookingUrl: 'https://calendar.google.com/example'
} satisfies Welcome5Props;

export default Welcome5;
