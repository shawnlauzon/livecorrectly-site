import { Wrap } from "@/components/wrap"

export function About() {
  return (
    <section className="pt-[clamp(56px,8vw,96px)]">
      <Wrap>
        <div className="grid grid-cols-[1.1fr_0.9fr] items-center gap-[clamp(32px,5vw,60px)] max-sm:grid-cols-1 max-sm:gap-7">
          <div>
            <h2 className="mb-6 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-[1.06] tracking-[-0.02em] text-ink">
              Hi, I&apos;m Shawn.
            </h2>
            <p className="mb-[18px] max-w-[34em] font-serif text-[clamp(1.1rem,1.6vw,1.26rem)] leading-[1.6] text-ink">
              I used to be frustrated constantly. I would compare myself to others and beat myself up
              because I wasn&apos;t as successful as they were. I would look outside myself for answers,
              and when they didn&apos;t work for me, I would get even more frustrated and beat myself up
              even more!
            </p>
            <p className="max-w-[34em] font-serif text-[clamp(1.1rem,1.6vw,1.26rem)] leading-[1.6] text-ink">
              Now as a certified Human Design for Business (BG5) consultant, I teach you strategies to
              move from frustrated, bitter, and angry to successful, satisfied, and at peace. I focus on
              practical tools which you can use immediately, rather than giving you a bunch of theory
              which you&apos;ll immediately forget. Life will never be the same again.
            </p>
          </div>
          <div className="portrait-frame relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[20px] border border-line max-sm:mx-auto max-sm:w-full max-sm:max-w-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.fractalhumandesign.com/_next/static/media/shawn-bent.01001bc9.jpg"
              alt="Shawn Lauzon"
              className="absolute inset-0 size-full object-cover object-[center_top]"
            />
            <span className="relative px-[18px] py-0 text-center text-[0.8rem] uppercase tracking-[0.14em] text-muted-lc">
              Shawn Lauzon
            </span>
          </div>
        </div>
      </Wrap>
    </section>
  )
}
