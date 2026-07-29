import { Wrap } from "@/components/wrap"

const reasons = [
  {
    label: "Decisions",
    text: "Make your own calls with confidence — without depending on others for advice.",
  },
  {
    label: "Marketing",
    text: "Bring in the right clients without selling like someone you're not.",
  },
  {
    label: "Profit",
    text: "Make your money from the work that actually energizes you.",
  },
]

export function HowItHelps() {
  return (
    <section id="more" className="pt-[clamp(52px,8vw,96px)]">
      <Wrap>
        <div className="mb-[42px] max-w-[640px]">
          <p className="mb-[14px] font-body text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-grape">
            How it helps
          </p>
          <h2 className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-bold leading-[1.06] tracking-[-0.02em] text-ink text-balance">
            What changes for you
          </h2>
        </div>
        <div>
          {reasons.map((reason, i) => (
            <div
              key={reason.label}
              className={`grid grid-cols-[170px_1fr] items-start gap-7 border-t border-line py-10 max-sm:grid-cols-1 max-sm:gap-3 max-sm:py-[30px] ${
                i === reasons.length - 1 ? "border-b" : ""
              }`}
            >
              <span className="flex items-center gap-[11px] pt-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-grape max-sm:pt-0">
                <span className="size-2 flex-none rounded-full bg-marigold" aria-hidden="true" />
                {reason.label}
              </span>
              <h3 className="max-w-[15em] font-display text-[clamp(1.5rem,3vw,2.15rem)] font-bold leading-[1.14] tracking-[-0.02em] text-ink text-pretty">
                {reason.text}
              </h3>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  )
}
