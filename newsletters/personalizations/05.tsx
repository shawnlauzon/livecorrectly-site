import * as React from 'react';
import { Head, Heading, Section } from 'react-email';
import { P } from '@/emails/content';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';

/**
 * Per-type personalization section for Newsletter #5.
 * Renders a closing section tailored to the subscriber's HD type.
 */
export function Newsletter05Personalization({
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
          pause for a bit and see if it&apos;s still something you want to be
          doing. And if not, give yourself permission to quit. It frees up the
          time to do what you&apos;re really called to be doing.
        </P>
      </Section>
    );
  }

  if (chart.isProjector) {
    return (
      <Section>
        <P>
          Ahhh my dear Advisor! It can feel hard to wait, and wait, and feel
          bitter that you have all the answers and{' '}
          <em>if only someone would ask you!</em>
        </P>
        <P>
          The coaching industry (you know you&apos;re designed to be a coach,
          right?) really makes this worse. They tell people that anyone can help
          anyone, and that all that is needed is to know how to market yourself.
          This creates really bad coaches, giving the whole industry a bad name.
          (I know because I was seduced by it.)
        </P>
        <P>
          You are designed not like them. You are designed to be one of the
          great coaches. A coach who can really see where people are stuck, to
          literally feel what they are feeling, and to be able to guide them to
          success.
        </P>
        <P>
          But although this is your design, it doesn&apos;t happen
          automatically. It takes practice. It takes training. It takes mastery.
          And this is what you can do while you are &quot;waiting&quot;:
          becoming a master. And when you have mastery, in whatever field calls
          to you, you will be one of the best.
        </P>
        <P>
          So don&apos;t push yourself out there before you&apos;re ready to
          shine. Wait until you know you have something amazing to
          share&mdash;that&apos;s the time to let your light shine.
        </P>
        <P>
          And when that time comes, you won&apos;t need to try to be
          seen&mdash;it will be obvious to everyone that the master has arrived.
        </P>
      </Section>
    );
  }

  if (chart.isReflector) {
    return (
      <Section>
        <P>
          Congratulations, you win the award for the longest time to wait: a
          full moon cycle!
        </P>
        <P>
          I have to be straight with you: although I know a surprising number of
          Evaluators, I haven&apos;t had enough clients to really give advice
          grounded in what I&apos;ve seen. And so I won&apos;t go into detail
          here.
        </P>
        <P>
          But this is good news for you! If you resonate with what I have
          written, I am looking for a single person to work with and explore how
          waiting through the entire lunar cycle works in practice. It will be a
          great experience, and I&apos;ll be able to create software which will
          help you be able to live correctly.
        </P>
        <P>
          If you&apos;re interested, please reply to this email and we can
          discuss further.
        </P>
      </Section>
    );
  }

  return null;
}
