import TrackedLink from "./tracked-link";
import { BLACK_FRIDAY, findOffer } from "@/lib/offers";
import styles from "./black-friday-banner.module.css";

/** Sticky Black Friday strip above the nav, shown to everyone. */
export default function BlackFridayBanner() {
  const offer = findOffer(BLACK_FRIDAY.offerId);
  if (!offer) return null;

  return (
    <div className={styles.banner}>
      <TrackedLink
        className={styles.link}
        href={`/work-with-me#${offer.id}`}
        event="black_friday_banner_click"
      >
        <span className={styles.tag}>Black Friday sale</span>
        <span className={styles.deal}>
          {offer.name} session <s className={styles.was}>${offer.price}</s>{" "}
          <strong className={styles.now}>${BLACK_FRIDAY.price}</strong>
        </span>
        <span className={styles.code}>
          Code <strong className={styles.codeValue}>{BLACK_FRIDAY.promoCode}</strong>
        </span>
        <span className={styles.until}>through {BLACK_FRIDAY.endsOn}{" "}&rarr;</span>
      </TrackedLink>
    </div>
  );
}
