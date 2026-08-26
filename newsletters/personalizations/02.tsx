import * as React from 'react';
import { Head, Heading, Section } from 'react-email';
import { P } from '@/emails/content';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

/**
 * Per-type personalization section for Newsletter #2.
 * Renders a closing section tailored to the subscriber's HD type.
 */
export function Newsletter02Personalization({
  chart,
}: {
  chart: EmailChartData;
}) {
  if (chart.isManifestor) {
    return (
      <Section>
        <Heading>Per-type advice</Heading>
        <P>
          Congratulations! You are among the 10% of people who do NOT need to
          wait!
        </P>
        <P>
          The funny thing about this benefit is that it&apos;s not optional.
          Because 90% of people are designed to wait, if you don&apos;t get
          things started, it&apos;s likely no one will.
        </P>
        <P>
          So you need to have courage. The courage to believe in yourself when
          no one else does. The courage to find the people (Builders) to make
          your vision a reality. The courage to look for the people who can
          guide you to success (Advisors). And maybe even someone (an Evaluator)
          who can tell you the truth if what you&apos;re building is working or
          not.
        </P>
        <P>
          You are the person who everyone else is waiting for. Go ahead, start
          something new.
        </P>
      </Section>
    );
  }

  if (chart.isPureGenerator) {
    return (
      <Section>
        <Heading as="h3">Per-type advice</Heading>
        <P>
          As a Classic Builder, you arguably have it a bit easier to wait than
          your cousins, the Express Builders. Because if you&apos;re anything
          like me (a Classic Builder), you&apos;ve tried to manifest things and
          they haven&apos;t worked out. And from speaking with my clients, I
          know I&apos;m not alone.
        </P>
        <P>
          The main difference between you and Express Builders is that you grow
          in a step-by-step fashion. Compared to them, you&apos;re like the
          Tortoise who raced with the Hare. And the thing to remember is that
          the Tortoise won.
        </P>
        <P>
          So have patience and grow your skills. And don&apos;t be afraid of
          trying whatever you feel excited about! Doing what you love will
          energize you, so there&apos;s no need for you to conserve your energy.
          If you feel the call for anything, try it out! You never know what the
          future will bring.
        </P>
      </Section>
    );
  }

  if (chart.isManifestingGenerator) {
    return (
      <Section>
        <Heading as="h3">Per-type advice</Heading>
        <P>
          As an Express Builder, there&apos;s good news and bad news. The bad
          news is that you&apos;re tempted to act like an Initiator and get
          things started, just from an idea in your head. And then when you get
          frustrated, you might just keep pushing and pushing without feeling
          satisfied.
        </P>
        <P>
          The good news is if you do Wait to Respond like all Builders should,
          then you have the best of all worlds: the ability to put thoughts in
          to action, and the energy to do much of the work
          yourself&mdash;something that true Initiators can only dream of!
        </P>
        <P>
          So always remember to be looking out for that frustration. And if
          it&apos;s there, and you didn&apos;t actually Respond to something,
          you might want to pause and see if this is the correct thing for you
          to be doing.
        </P>
      </Section>
    );
  }

  if (chart.isPureGenerator) {
  }

  if (chart.isProjector) {
    return (
      <Section>
        <P>
          <em>
            As an Advisor yourself, how do you relate to the idea of being like
            the Oracle? How can you spend time becoming a master of your craft?
          </em>
        </P>
      </Section>
    );
  }

  if (chart.isReflector) {
    return (
      <Section>
        <P>
          <em>
            As an Evaluator yourself, how did you feel about seeing yourself as
            the Architect? Is that something that resonates with you, or is
            there something different?
          </em>
        </P>
      </Section>
    );
  }

  return null;
}
