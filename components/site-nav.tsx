import Link from "next/link"
import { Wrap } from "@/components/wrap"

export function SiteNav() {
  return (
    <Wrap
      as="header"
      className="reveal d1 flex items-center justify-between py-[30px] max-sm:py-[22px]"
    >
      <Link
        href="/"
        className="font-display text-[1.28rem] font-bold tracking-[-0.02em] text-ink"
      >
        Live <span className="text-grape">Correctly</span>
      </Link>
      <Link
        href="/see-your-design"
        className="whitespace-nowrap rounded-full border-[1.5px] border-line px-4 py-[9px] text-[0.94rem] font-medium text-ink transition-colors hover:border-grape hover:text-grape-deep max-sm:px-[13px] max-sm:text-[0.82rem]"
      >
        See how you&apos;re designed
      </Link>
    </Wrap>
  )
}
