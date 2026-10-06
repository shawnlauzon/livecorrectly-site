import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import { getWebNewsletters } from "@/lib/newsletter/web";
import { getNewsletterPublication, getSubscriberById } from "@/lib/db";
import { weekdayName } from "@/lib/newsletter/cadence";
import NewsletterIndexCta from "./NewsletterIndexCta";
import AdminEditLink from "./AdminEditLink";
import RememberSubscriber from "@/components/remember-subscriber";
import { isSubscriberId } from "@/lib/subscriber-cookie";
import { getRememberedSubscriberId } from "@/lib/subscriber-cookie-server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Newsletter — Live Correctly",
  description:
    "Human Design insights for solopreneurs. Published weekly by Shawn Lauzon.",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function NewsletterIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  // An email link's ?s= wins; otherwise fall back to the id remembered in the cookie.
  const subscriberParam = isSubscriberId(resolvedSearchParams.s) ? resolvedSearchParams.s : null;
  const subscriberId = subscriberParam ?? (await getRememberedSubscriberId());
  const [issues, publication, subscriber] = await Promise.all([
    getWebNewsletters(),
    getNewsletterPublication(1),
    subscriberId ? getSubscriberById(subscriberId) : null,
  ]);
  // Issue links carry ?s= only when it came from the URL; the cookie covers the rest.
  const linkParam = subscriber && subscriberParam;
  const sendDay =
    publication?.sendWeekday != null ? weekdayName(publication.sendWeekday) : null;

  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <div className={styles.heading}>
          <h1 className={styles.h1}>Newsletter</h1>
          <AdminEditLink href="/admin/newsletters" />
        </div>
        {!subscriber && <NewsletterIndexCta sendDay={sendDay} />}
        <ul className={styles.list}>
          {issues.map((issue) => (
            <li key={issue.slug} className={styles.item}>
              <Link href={linkParam ? `/newsletter/${issue.slug}?s=${linkParam}` : `/newsletter/${issue.slug}`} className={styles.itemLink}>
                {issue.thumbnailUrl && (
                  <Image
                    src={issue.thumbnailUrl}
                    alt=""
                    width={160}
                    height={100}
                    className={styles.thumb}
                  />
                )}
                <div className={styles.itemText}>
                  {issue.published ? (
                    <p className={styles.date}>
                      <time dateTime={issue.publishedAt}>
                        {formatDate(issue.publishedAt)}
                      </time>
                    </p>
                  ) : (
                    <p className={`${styles.date} ${styles.draft}`}>Draft</p>
                  )}
                  <h2 className={styles.title}>
                    {issue.title}
                    {!issue.published && (
                      <span className={styles.badge}>Unpublished</span>
                    )}
                  </h2>
                  <p className={styles.description}>{issue.preview}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
      {linkParam && <RememberSubscriber id={linkParam} />}
    </>
  );
}
