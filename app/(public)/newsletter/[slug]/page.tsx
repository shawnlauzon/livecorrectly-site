import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import SiteNav from '@/components/site-nav';
import SiteFooter from '@/components/site-footer';
import { getWebNewsletter, getAllSlugs, getSlugRedirects } from '@/newsletters/web';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import NewsletterCta from './NewsletterCta';
import NewsletterShare from './NewsletterShare';
import NewsletterTracker from './NewsletterTracker';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateStaticParams() {
  const current = (await getAllSlugs()).map((slug) => ({ slug }));
  const oldSlugs = [...getSlugRedirects().keys()].map((slug) => ({ slug }));
  return [...current, ...oldSlugs];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getWebNewsletter(slug);
  if (!issue) {
    const redirectSlug = getSlugRedirects().get(slug);
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

  // Resolve subscriber early — needed for markdown conditionals, personalizations, and "Built for" line
  const subscriberParam =
    typeof resolvedSearchParams.s === 'string' ? resolvedSearchParams.s : null;
  let chart = null;
  let subscriberName: string | null = null;
  if (subscriberParam && UUID_RE.test(subscriberParam)) {
    const subscriber = await getSubscriberById(subscriberParam);
    if (subscriber) {
      subscriberName = subscriber.last_name
        ? `${subscriber.first_name} ${subscriber.last_name}`
        : subscriber.first_name;
      if (subscriber.chart) {
        chart = parseChartForEmail(subscriber.chart.chart);
      }
    }
  }

  // Load newsletter with chart so markdown conditionals are evaluated
  const issue = await getWebNewsletter(slug, chart);
  if (!issue) {
    // Check if this is an old slug that should redirect
    const redirectSlug = getSlugRedirects().get(slug);
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
          {issue.showHeroImage && (
            <Image
              src={`/newsletter/${issue.image}`}
              alt=""
              width={672}
              height={380}
              className={styles.hero}
              priority
            />
          )}
          <NewsletterTracker slug={issue.slug} issue={issue.number} personalized={!!subscriberParam} />
          <div className={styles.dateLine}>
            <p className={styles.date}>
              <time dateTime={issue.publishedAt}>
                {formatDate(issue.publishedAt)}
              </time>
            </p>
            <NewsletterShare url={shareUrl} title={issue.title} slug={issue.slug} />
          </div>
          <h1 className={styles.h1}>{issue.title}</h1>
          {subscriberName && (
            <p className={styles.builtFor}>Built for {subscriberName}</p>
          )}
          <div
            className={styles.body}
            dangerouslySetInnerHTML={{ __html: issue.bodyHtml }}
          />
          {issue.ps.map((p, i) => (
            <div key={i} className={styles.ps}>
              <strong>{getPostscriptPrefix(i)}</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: p }} />
            </div>
          ))}
        </article>
        {!subscriberParam && <NewsletterCta />}
      </main>
      <SiteFooter />
      {issue.published && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
