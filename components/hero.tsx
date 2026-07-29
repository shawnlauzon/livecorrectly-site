import Link from "next/link"
import { Wrap } from "@/components/wrap"

export function Hero() {
  return (
    <main className="relative flex min-h-[82vh] items-center pb-14 pt-10 max-sm:min-h-0 max-sm:pb-10 max-sm:pt-6">
      <div className="aura" aria-hidden="true" />
      <Wrap className="relative z-[2] max-w-[760px]">
        <p className="reveal d1 mb-[26px] font-body text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-grape">
          Human Design for solopreneurs
        </p>
        <h1 className="reveal d2 mb-7 font-display text-[clamp(2.5rem,6.4vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink text-balance">
          A business designed
          <br />
          around <span className="swipe">you</span>.
        </h1>
        <p className="reveal d3 mb-[38px] max-w-[33em] text-[clamp(1.05rem,1.7vw,1.28rem)] leading-[1.55] text-muted-lc">
          Stop listening to coaches who tell you how they&apos;d run it. Yours should work the way you
          do. We help you understand how.
        </p>
        <div className="reveal d4 flex flex-wrap items-center gap-[26px]">
          <Link
            href="/see-your-design"
            className="inline-block rounded-xl bg-grape px-7 py-[15px] text-base font-semibold text-white shadow-[0_8px_22px_-10px_rgba(106,75,214,.7)] transition-all hover:-translate-y-0.5 hover:bg-grape-deep hover:shadow-[0_14px_28px_-12px_rgba(106,75,214,.75)] active:translate-y-0 max-sm:w-full max-sm:text-center"
          >
            See how you&apos;re designed
          </Link>
        </div>
        <p className="reveal d4 mt-[22px] text-[0.98rem] leading-[1.5] text-muted-lc">
          Already have your chart, or want more depth?{" "}
          <Link
            href="#book"
            className="border-b-[1.5px] border-marigold pb-0.5 font-medium text-ink transition-colors hover:text-grape-deep"
          >
            Book a conversation
          </Link>
        </p>
      </Wrap>
    </main>
  )
}
