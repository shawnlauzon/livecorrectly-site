import Link from "next/link";
import Wrap from "./wrap";
import TrackedLink from "./tracked-link";
import BlackFridayBanner from "./black-friday-banner";
import { getRememberedSubscriberId } from "@/lib/subscriber-cookie-server";
import styles from "./site-nav.module.css";

export default async function SiteNav({
  variant = "landing",
  backHref = "/",
  hideNewsletterLink = false,
  subscriberId: knownSubscriberId,
}: {
  variant?: "landing" | "back";
  backHref?: string;
  hideNewsletterLink?: boolean;
  /**
   * Subscriber the page already identified (e.g. from an email link's `?s=`).
   * Needed on the first visit from a link, before RememberSubscriber has set
   * the cookie. Falls back to the cookie when omitted.
   */
  subscriberId?: string;
}) {
  // Returning newsletter readers (see RememberSubscriber) get links to their own pages
  const subscriberId = knownSubscriberId ?? (await getRememberedSubscriberId());

  return (
    <>
      <BlackFridayBanner />
      <Wrap as="header" className={styles.nav}>
        <Link className={styles.mark} href="/">
          Live <em className={styles.markAccent}>Correctly</em>
        </Link>
        <nav className={styles.links}>
          {variant === "landing" && subscriberId && (
            <TrackedLink
              className={styles.link}
              href={`/see-your-design/${subscriberId}`}
              event="your_chart_click"
              params={{ location: "nav" }}
            >
              Your design
            </TrackedLink>
          )}
          {!hideNewsletterLink && (
            <Link
              className={subscriberId ? styles.link : `${styles.link} ${styles.hideNarrow}`}
              href="/newsletter"
            >
              {subscriberId ? "Your newsletters" : "Newsletter"}
            </Link>
          )}
          {variant === "landing" ? (
            subscriberId ? (
              <TrackedLink
                className={styles.button}
                href="/work-with-me"
                event="work_with_me_click"
                params={{ location: "nav" }}
              >
                Work with me
              </TrackedLink>
            ) : (
              <TrackedLink
                className={styles.button}
                href="/see-your-design"
                event="cta_click"
                params={{ location: "nav" }}
              >
                See how you&rsquo;re designed
              </TrackedLink>
            )
          ) : (
            <Link className={styles.back} href={backHref}>
              &larr; Back
            </Link>
          )}
        </nav>
      </Wrap>
    </>
  );
}
