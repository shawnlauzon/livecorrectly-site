import * as React from 'react';
import { Head, Heading, Section } from 'react-email';
import { P } from '../content';
import type { EmailChartData } from '../../lib/hd-chart/parse-for-email';

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
          The funny thing I&apos;ve found is that it is the Initiators who get
          angry that they always have to be the ones to start something.
        </P>
      </Section>
    );
  }

  if (chart.isPureGenerator || chart.isManifestingGenerator) {
    return (
      <Section>
        <Heading as="h3">Per-type advice</Heading>
        <P>
          <em>
            As a Builder yourself, do you feel like Neo? Do you feel exhausted
            when doing work that you don&apos;t enjoy? Do you have tons of
            energy when doing something you love, even towards the end of the
            day? Let me know!
          </em>
        </P>
      </Section>
    );
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
            As an Evalutor yourself, how did you feel about seeing yourself as
            the Architect? Is that something that resonates with you, or is
            there something different?
          </em>
        </P>
      </Section>
    );
  }

  return null;
}
