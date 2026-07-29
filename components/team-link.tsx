import { Wrap } from "@/components/wrap"

export function TeamLink() {
  return (
    <section className="pt-[clamp(44px,6vw,68px)]">
      <Wrap>
        <div className="flex flex-wrap items-center justify-between gap-[22px] rounded-[20px] bg-ink p-[clamp(28px,4vw,42px)] max-sm:flex-col max-sm:items-start">
          <p className="max-w-[19em] font-display text-[clamp(1.15rem,2vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.015em] text-white">
            Working together on a team?
          </p>
          <a
            href="https://workcorrectly.com"
            className="flex-none whitespace-nowrap rounded-[11px] bg-marigold px-6 py-[14px] text-base font-semibold text-ink transition-all hover:-translate-y-0.5 hover:bg-marigold-bright max-sm:w-full max-sm:text-center"
          >
            See more at Work Correctly &rarr;
          </a>
        </div>
      </Wrap>
    </section>
  )
}
