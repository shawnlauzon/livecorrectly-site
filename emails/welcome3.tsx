import * as React from 'react';
import { Heading, Text, Section, Link, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { CareerTypeHighlight } from './components/career-type-table';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { authorityWriteups, authorityTips, lookupByAuthority } from './content';

interface Welcome3Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 3: Decision-Making Strategy (Inner Authority)
 * Ported from fractalhumandesign/email/templates/welcome3.html
 * Copy is verbatim from the original template.
 */
export const Welcome3 = ({ chart, unsubscribeUrl }: Welcome3Props) => {
  const authorityWriteup = lookupByAuthority(authorityWriteups, chart.innerAuthority);
  const authorityTip = lookupByAuthority(authorityTips, chart.innerAuthority);

  return (
    <EmailLayout
      preview={`To make decisions you can trust, ${chart.innerAuthorityDescription}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h2"
        className="mt-[16px] text-[24px] font-bold tracking-tight text-[#221B3D]"
      >
        Success Code 3: Your Decision-Making Strategy
      </Heading>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        We all have decisions to make: should I work with this person or not,
        should I date or marry this person. By following the{' '}
        <em>decision-making strategy</em>, we let go of the old patterns which
        have controlled us in the past, and move towards a new way of being
        which is authentically ourself. This is not an instant fix; it can take
        years to completely let go of these destructive patterns. But the payoff
        is worth it: a life without {chart.notSelfTheme} and a nearly effortless
        way of being.
      </Text>

      <CareerTypeHighlight
        number="3"
        title="Decision-Making Strategy"
        description={`Your way to make decisions is to ${chart.innerAuthorityDescription}.`}
      />

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        {authorityWriteup}
      </Text>

      {/* Inner authority video link */}
      <Section className="mt-[8px]">
        <Link href={chart.innerAuthorityVideo}>
          <Img
            src={chart.typeButtonGif}
            height={180}
            width={320}
            alt={`How to ${chart.innerAuthorityDescription} video`}
          />
          <Text>
            See how to {chart.innerAuthorityDescription} in this video.
          </Text>
        </Link>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        {authorityTip}
      </Text>

      {/* "This is the way" image */}
      <Section className="w-[85%]">
        <Img
          alt="Star Wars Mandalorian - This is the way"
          src="https://fractalhumandesign.s3.amazonaws.com/site/images/this-is-the-way.jpg"
          width={480}
          className="w-full rounded-xl"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '100%'
          }}
        />
        <Text className="mt-[16px] text-[14px] leading-[24px]">
          Your decision-making strategy, to {chart.decisionMakingStrategy}, is
          your way.
        </Text>
      </Section>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        This brings us to a core teaching of Human Design: the mind is never the
        way to make decisions. It is a tool, and this tool is ideal for
        processing information and considering different options. But not for
        making decision. However, it will continually try to persuade you into
        ignoring your body, complaining &quot;you&apos;re not being
        logical&quot;. Just let it go.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Remember, your mind is the result of decades of conditioning from
        parents, teachers, coaches, society, advertising: everyone telling you
        what <em>they think</em> you should do, when they don&apos;t even know
        you. And aren&apos;t you just sick of it?!?
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        That&apos;s where Human Design fits in. This simple decision-making
        strategy, to {chart.decisionMakingStrategy}, you will let go of the
        mental chatter and begin to hear your true nature. Because this is
        always a part of you, your genetic birthright, it is something you can
        always depend on begin to make <b>decisions you can trust</b>.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px]">
        Congratulations! We&apos;ve covered a lot in a short amount of time. You
        now know how you can make decisions you can trust, and can begin to let
        go of depending on others for guidance. Tomorrow we&apos;ll give you
        some useful indicators that you can use to understand if you&apos;re
        on-track or off-track. See you then!
      </Text>
    </EmailLayout>
  );
};

Welcome3.PreviewProps = {
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
    signatureVideo: 'https://youtu.be/fHGRdJSyE34',
    topShadow: 'Willpower',
    bridgeDescriptions: []
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test'
} satisfies Welcome3Props;

export default Welcome3;
