import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { Proof } from "@/components/landing/proof";
import { Workflow } from "@/components/landing/workflow";
import { TrustEngine } from "@/components/landing/trust-engine";
import { Audience } from "@/components/landing/audience";
import { CtaBand } from "@/components/landing/cta-band";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Proof />
        <Workflow />
        <TrustEngine />
        <Audience />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
