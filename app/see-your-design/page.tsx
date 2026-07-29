import type { Metadata } from "next"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { Wrap } from "@/components/wrap"
import { ChartRequestForm } from "@/components/chart-request-form"

export const metadata: Metadata = {
  title: "See how you're designed — Live Correctly",
  description:
    "Enter your birth details to generate your Human Design chart and see how you're wired to work.",
}

export default function SeeYourDesignPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 pb-14 pt-6">
        <Wrap className="max-w-[620px]">
          <p className="reveal d1 mb-[18px] font-body text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-grape">
            See how you&apos;re designed
          </p>
          <h1 className="reveal d2 mb-4 font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink text-balance">
            Your <span className="swipe">chart</span>, from your birth details.
          </h1>
          <p className="reveal d3 mb-9 max-w-[34em] text-[clamp(1.02rem,1.6vw,1.18rem)] leading-[1.55] text-muted-lc">
            Enter where and when you were born and we&apos;ll generate your Human Design chart. The more
            accurate your birth time, the more precise your chart.
          </p>
          <div className="reveal d4">
            <ChartRequestForm />
          </div>
        </Wrap>
      </main>
      <SiteFooter />
    </div>
  )
}
