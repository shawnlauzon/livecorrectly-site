import { Wrap } from "@/components/wrap"

export function SiteFooter() {
  return (
    <Wrap
      as="footer"
      className="flex flex-wrap items-center justify-center gap-4 pb-[clamp(56px,7vw,84px)] pt-[clamp(52px,6vw,72px)] text-[0.9rem] text-muted-lc max-sm:gap-[10px]"
    >
      <span>
        <a
          href="mailto:shawn@livecorrectly.com"
          className="transition-colors hover:text-grape-deep"
        >
          shawn@livecorrectly.com
        </a>
        {" \u00A0\u00B7\u00A0 "}
        Austin, TX
      </span>
    </Wrap>
  )
}
