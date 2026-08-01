import SiteNav from "@/components/site-nav";
import Hero from "@/components/hero";
import PullQuote from "@/components/pull-quote";
import HowItHelps from "@/components/how-it-helps";
import Method from "@/components/method";
import Testimonial from "@/components/testimonial";
import About from "@/components/about";
import ClosingCta from "@/components/closing-cta";
import SiteFooter from "@/components/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <hr className="rule" />
        <PullQuote />
        <hr className="rule" />
        <HowItHelps />
        <Method />
        <Testimonial />
        <About />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
