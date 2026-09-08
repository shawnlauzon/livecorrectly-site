import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import { getWebNewsletter, getAllSlugs } from "@/newsletters/web";
import { getSubscriberById } from "@/lib/db";
import { parseChartForEmail } from "@/lib/hd-chart/parse-for-email";
import { getWebPersonalization } from "@/newsletters/personalizations/web";
import PersonalizationCallout from "./PersonalizationCallout";
import PersonalizedSection from "./PersonalizedSection";
import NewsletterCta from "./NewsletterCta";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getWebNewsletter(slug);
  if (!issue) return {};

  const url = `https://www.livecorrectly.com/newsletter/${issue.slug}`;

  return {
    title: `${issue.title} — Live Correctly`,
    description: issue.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: issue.title,
      description: issue.description,
      url,
      publishedTime: issue.publishedAt,
      authors: ["Shawn Lauzon"],
    },
    twitter: {
      card: "summary",
      title: issue.title,
      description: issue.description,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

export default async function NewsletterIssuePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const issue = await getWebNewsletter(slug);
  if (!issue) notFound();

  // Resolve personalization when ?s= is a valid UUID and the newsletter has a web component
  const subscriberId = typeof resolvedSearchParams.s === 'string' ? resolvedSearchParams.s : null;
  const PersonalizationComponent = issue.hasWebPersonalization
    ? getWebPersonalization(issue.number)
    : undefined;

  let chart = null;
  if (subscriberId && UUID_RE.test(subscriberId) && PersonalizationComponent) {
    const subscriber = await getSubscriberById(subscriberId);
    if (subscriber?.chart) {
      chart = parseChartForEmail(subscriber.chart.chart);
    }
  }

  const shareUrl = `https://www.livecorrectly.com/newsletter/${issue.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: issue.title,
    description: issue.description,
    datePublished: issue.publishedAt,
    author: {
      "@type": "Person",
      name: "Shawn Lauzon",
    },
    publisher: {
      "@type": "Organization",
      name: "Live Correctly",
      url: "https://www.livecorrectly.com",
    },
    mainEntityOfPage: shareUrl,
  };

  return (
    <>
      <SiteNav variant="back" backHref="/newsletter" hideNewsletterLink />
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
          <p className={styles.date}>
            <time dateTime={issue.publishedAt}>
              {formatDate(issue.publishedAt)}
            </time>
          </p>
          <h1 className={styles.h1}>{issue.title}</h1>
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
          {chart && PersonalizationComponent ? (
            <PersonalizedSection
              Component={PersonalizationComponent}
              chart={chart}
              shareUrl={shareUrl}
            />
          ) : (
            <PersonalizationCallout hasWebPersonalization={issue.hasWebPersonalization} />
          )}
        </article>
        <NewsletterCta />
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
