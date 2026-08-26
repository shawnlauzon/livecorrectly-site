import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import { getWebNewsletter, getAllSlugs } from "@/newsletters/web";
import PersonalizationCallout from "./PersonalizationCallout";
import NewsletterCta from "./NewsletterCta";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getWebNewsletter(slug);
  if (!issue) return {};

  const url = `https://livecorrectly.com/newsletter/${issue.slug}`;

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

export default async function NewsletterIssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = await getWebNewsletter(slug);
  if (!issue) notFound();

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
      url: "https://livecorrectly.com",
    },
    mainEntityOfPage: `https://livecorrectly.com/newsletter/${issue.slug}`,
  };

  return (
    <>
      <SiteNav variant="back" backHref="/newsletter" hideNewsletterLink />
      <main className={styles.page}>
        <article>
          {issue.image && (
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
          <PersonalizationCallout />
        </article>
        <NewsletterCta />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
