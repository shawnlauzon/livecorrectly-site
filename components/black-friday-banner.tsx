import TrackedLink from "./tracked-link";
import { BLACK_FRIDAY, findOffer, isBlackFriday } from "@/lib/offers";
import styles from "./black-friday-banner.module.css";

/** Subscriber-only strip above the nav, shown during the Black Friday window. */
export default function BlackFridayBanner() {
  const offer = findOffer(BLACK_FRIDAY.offerId);
  if (!offer || !isBlackFriday()) return null;

  return (
    <div className={styles.banner}>
      <TrackedLink
        className={styles.link}
        href={`/work-with-me#${offer.id}`}
        event="black_friday_banner_click"
      >
        {offer.name} session ${BLACK_FRIDAY.price} (normally ${offer.price}) through Sunday &rarr;
      </TrackedLink>
    </div>
  );
}
