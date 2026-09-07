import SiteNav from "@/components/site-nav";
import Hero from "@/components/hero";
import PullQuote from "@/components/pull-quote";
import HowItHelps from "@/components/how-it-helps";
import Method from "@/components/method";
import Testimonial from "@/components/testimonial";
import About from "@/components/about";
import ClosingCta from "@/components/closing-cta";
import SiteFooter from "@/components/site-footer";
import SectionTracker from "@/components/section-tracker";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <hr className="rule" />
        <PullQuote />
        <hr className="rule" />
        <SectionTracker name="how_it_helps"><HowItHelps /></SectionTracker>
        <SectionTracker name="method"><Method /></SectionTracker>
        <SectionTracker name="testimonial"><Testimonial /></SectionTracker>
        <SectionTracker name="about"><About /></SectionTracker>
        <SectionTracker name="closing_cta"><ClosingCta /></SectionTracker>
      </main>
      <SiteFooter />
    </>
  );
}
