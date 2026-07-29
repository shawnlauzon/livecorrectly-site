import Link from "next/link"
import { Wrap } from "@/components/wrap"

export function ClosingCTA() {
  return (
    <section className="pt-[clamp(64px,9vw,110px)] text-center">
      <Wrap>
        <Link
          href="/see-your-design"
          className="inline-block rounded-xl bg-grape px-7 py-[15px] text-base font-semibold text-white shadow-[0_8px_22px_-10px_rgba(106,75,214,.7)] transition-all hover:-translate-y-0.5 hover:bg-grape-deep hover:shadow-[0_14px_28px_-12px_rgba(106,75,214,.75)] active:translate-y-0 max-sm:w-full max-sm:text-center"
        >
          See how you&apos;re designed
        </Link>
        <p className="mt-[22px] text-[0.98rem] leading-[1.5] text-muted-lc">
          Already have your chart, or want more depth?{" "}
          <Link
            href="#book"
            className="border-b-[1.5px] border-marigold pb-0.5 font-medium text-ink transition-colors hover:text-grape-deep"
          >
            Book a conversation
          </Link>
        </p>
      </Wrap>
    </section>
  )
}
