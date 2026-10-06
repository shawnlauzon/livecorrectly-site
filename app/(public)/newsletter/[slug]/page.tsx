import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import SiteNav from '@/components/site-nav';
import SiteFooter from '@/components/site-footer';
import { getWebNewsletter, getAllSlugs, getSlugRedirects } from '@/lib/newsletter/web';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import NewsletterCta from './NewsletterCta';
import NewsletterShare from './NewsletterShare';
import NewsletterTracker from './NewsletterTracker';
import PersonalizationCallout from './PersonalizationCallout';
import SampleValueTooltip from './SampleValueTooltip';
import { SAMPLE_CHART } from '@/lib/newsletter/sample-chart';
import AdminEditLink from '../AdminEditLink';
import RememberSubscriber from '@/components/remember-subscriber';
import { isSubscriberId } from '@/lib/subscriber-cookie';
import { getRememberedSubscriberId } from '@/lib/subscriber-cookie-server';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const current = (await getAllSlugs()).map((slug) => ({ slug }));
  const oldSlugs = [...(await getSlugRedirects()).keys()].map((slug) => ({ slug }));
  return [...current, ...oldSlugs];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getWebNewsletter(slug);
  if (!issue) {
    const redirectSlug = (await getSlugRedirects()).get(slug);
    if (redirectSlug) permanentRedirect(`/newsletter/${redirectSlug}`);
    return {};
  }

  const url = `https://www.livecorrectly.com/newsletter/${issue.slug}`;

  return {
    title: `${issue.title} — Live Correctly`,
    description: issue.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: issue.title,
      description: issue.description,
      url,
      publishedTime: issue.publishedAt,
      authors: ['Shawn Lauzon'],
    },
    twitter: {
      card: 'summary',
      title: issue.title,
      description: issue.description,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

export default async function NewsletterIssuePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // Resolve subscriber early — needed for markdown conditionals, personalizations, and "Built for" line.
  // An email link's ?s= wins; otherwise fall back to the id remembered in the cookie.
  const subscriberParam = isSubscriberId(resolvedSearchParams.s) ? resolvedSearchParams.s : null;
  const subscriberId = subscriberParam ?? (await getRememberedSubscriberId());
  let chart = null;
  let subscriberName: string | null = null;
  let firstName: string | undefined;
  let lastName: string | undefined;
  // Set only when the id matches a real subscriber
  let foundId: string | undefined;
  if (subscriberId) {
    const subscriber = await getSubscriberById(subscriberId);
    if (subscriber) {
      foundId = subscriber.id;
      firstName = subscriber.first_name;
      lastName = subscriber.last_name ?? undefined;
      subscriberName = subscriber.last_name
        ? `${subscriber.first_name} ${subscriber.last_name}`
        : subscriber.first_name;
      if (subscriber.chart) {
        chart = parseChartForEmail(subscriber.chart.chart);
      }
    }
  }

  // Load newsletter with chart so markdown conditionals are evaluated
  const issue = await getWebNewsletter(slug, { chart, subscriberId: foundId, firstName, lastName });
  if (!issue) {
    // Check if this is an old slug that should redirect
    const redirectSlug = (await getSlugRedirects()).get(slug);
    if (redirectSlug) {
      const qs = subscriberParam ? `?s=${subscriberParam}` : '';
      permanentRedirect(`/newsletter/${redirectSlug}${qs}`);
    }
    notFound();
  }

  const shareUrl = `https://www.livecorrectly.com/newsletter/${issue.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: issue.title,
    description: issue.description,
    datePublished: issue.publishedAt,
    author: {
      '@type': 'Person',
      name: 'Shawn Lauzon',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Live Correctly',
      url: 'https://www.livecorrectly.com',
    },
    mainEntityOfPage: shareUrl,
  };

  return (
    <>
      <SiteNav variant="back" backHref={subscriberParam ? `/newsletter?s=${subscriberParam}` : '/newsletter'} hideNewsletterLink />
      <main className={styles.page}>
        <article>
          {!issue.published && (
            <p className={styles.draftBanner}>Unpublished draft</p>
          )}
          <NewsletterTracker slug={issue.slug} issue={issue.number} personalized={!issue.usesSampleChart} />
          <div className={styles.dateLine}>
            <p className={styles.date}>
              <time dateTime={issue.publishedAt}>
                {formatDate(issue.publishedAt)}
              </time>
            </p>
            <div className={styles.dateActions}>
              <AdminEditLink
                href={`/admin/newsletters/${issue.newsletterId}/${issue.number}`}
              />
              <NewsletterShare url={shareUrl} title={issue.title} slug={issue.slug} />
            </div>
          </div>
          <h1 className={styles.h1}>{issue.title}</h1>
          {subscriberName && (
            <p className={styles.builtFor}>Built for {subscriberName}</p>
          )}
          {issue.usesSampleChart && (
            <PersonalizationCallout sampleCareerDesign={SAMPLE_CHART.careerDesign} slug={issue.slug} />
          )}
          {issue.usesSampleChart ? (
            <SampleValueTooltip
              html={issue.bodyHtml}
              sampleCareerDesign={SAMPLE_CHART.careerDesign}
            />
          ) : (
            <div
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: issue.bodyHtml }}
            />
          )}
          {issue.ps.map((p, i) => (
            <div key={i} className={styles.ps}>
              <strong>{getPostscriptPrefix(i)}</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: p }} />
            </div>
          ))}
        </article>
        {!foundId && <NewsletterCta />}
      </main>
      <SiteFooter />
      {subscriberParam && foundId && <RememberSubscriber id={subscriberParam} />}
      {issue.published && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
