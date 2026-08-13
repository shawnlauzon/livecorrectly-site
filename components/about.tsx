import Image from 'next/image';
import Wrap from './wrap';
import styles from './about.module.css';

export default function About() {
  return (
    <section className={styles.section}>
      <Wrap>
        <div className={styles.grid}>
          <div className={styles.portrait}>
            <Image
              className={styles.portraitImg}
              src="/shawn-lauzon-headshot.jpg"
              alt="Shawn Lauzon"
              fill
              sizes="15rem"
            />
          </div>
          <div className={styles.copy}>
            <h2 className={styles.h2}>Hi, I&rsquo;m Shawn.</h2>
            <p className={styles.prose}>
              I used to be frustrated constantly. I would compare myself to
              others and beat myself up because I wasn&rsquo;t as successful as
              they were. I would look outside myself for answers, and when they
              didn&rsquo;t work for me, I would get even more frustrated and
              beat myself up even more!
            </p>
            <p className={styles.prose}>
              Now as a certified Human Design for Business (BG5) consultant, I
              teach you strategies to move from frustrated, bitter, and angry to
              successful, satisfied, and at peace. I focus on practical tools
              which you can use immediately, rather than giving you a bunch of
              theory which you&rsquo;ll immediately forget.
            </p>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
