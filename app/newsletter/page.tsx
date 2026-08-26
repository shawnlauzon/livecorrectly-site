import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import { getWebNewsletters } from "@/newsletters/web";
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

export default async function NewsletterIndexPage() {
  const issues = await getWebNewsletters();

  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <h1 className={styles.h1}>Newsletter</h1>
        <section className={styles.cta}>
          <p>
            Sent every Wednesday, personalized to your specific Human Design.
          </p>
          <Link className="btn" href="/see-your-design">
            Subscribe for free
          </Link>
        </section>
        <ul className={styles.list}>
          {issues.map((issue) => (
            <li key={issue.slug} className={styles.item}>
              <Link href={`/newsletter/${issue.slug}`} className={styles.itemLink}>
                {issue.image && (
                  <Image
                    src={`/newsletter/${issue.image}`}
                    alt=""
                    width={160}
                    height={100}
                    className={styles.thumb}
                  />
                )}
                <div className={styles.itemText}>
                  <p className={styles.date}>
                    <time dateTime={issue.publishedAt}>
                      {formatDate(issue.publishedAt)}
                    </time>
                  </p>
                  <h2 className={styles.title}>{issue.title}</h2>
                  <p className={styles.description}>{issue.preview}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
