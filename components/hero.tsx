"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Wrap from "./wrap";
import styles from "./hero.module.css";

const SEEN_KEY = "hero-animated";

export default function Hero() {
  const [skipAnimation, setSkipAnimation] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem(SEEN_KEY);
    if (seen) {
      setSkipAnimation(true);
    } else {
      setSkipAnimation(false);
      sessionStorage.setItem(SEEN_KEY, "1");
    }
  }, []);

  const done = skipAnimation ? ` ${styles.done}` : "";

  return (
    <section className={styles.hero}>
      <Wrap className={styles.grid}>
        <div className={styles.copy}>
          <p className="eyebrow">Human Design</p>

          <ul className={styles.advice} aria-label="Common advice that didn't fit">
            <li className={`${styles.adviceLine} ${styles.strike1}${done}`}>
              Post five times a week.
            </li>
            <li className={`${styles.adviceLine} ${styles.strike2}${done}`}>
              You just need more discipline.
            </li>
            <li className={`${styles.adviceLine} ${styles.strike3}${done}`}>
              Be consistent.
            </li>
          </ul>

          <h1 className={styles.h1}>
            You&rsquo;ve tried it their way.
            <span className={styles.turnClip}>
              <span className={`${styles.turn}${done}`}>Now do it yours.</span>
            </span>
          </h1>

          <p className={styles.lede}>
            That&rsquo;s not a discipline problem. People are built differently,
            and advice built for someone else&rsquo;s wiring won&rsquo;t hold no
            matter how hard you push. Human Design shows you how yours actually
            works.
          </p>

          <div className={styles.ctaGroup}>
            <Link className="btn" href="/see-your-design">
              See how you&rsquo;re designed
            </Link>
            <p className={styles.ctaSub}>
              Already have your chart, or want more depth?{" "}
              <a
                className="link"
                href="https://calendar.google.com/appointments/schedules/AcZssZ1kXUVAC-LNzJfVTRh5vOTKdXCDVuH1wAJvpXrgdjWLoq8XBGl5aYR3SJ1nTkN5pwwuuEnWzz8m"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a conversation
              </a>
            </p>
          </div>
        </div>

        <div className={styles.photo}>
          <Image
            src="/hero-photo.jpg"
            alt="A person jumping with a smiley-face balloon"
            fill
            sizes="(max-width: 56rem) 100vw, 45vw"
            priority
          />
        </div>
      </Wrap>
    </section>
  );
}
