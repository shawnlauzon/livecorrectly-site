import SiteNav from "@/components/site-nav";
import Hero from "@/components/hero";
import HowItHelps from "@/components/how-it-helps";
import About from "@/components/about";
import TeamLink from "@/components/team-link";
import ClosingCta from "@/components/closing-cta";
import SiteFooter from "@/components/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <Hero />
      <HowItHelps />
      <About />
      <TeamLink />
      <ClosingCta />
      <SiteFooter />
    </>
  );
}
