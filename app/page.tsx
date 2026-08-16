import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { Proof } from "@/components/landing/proof";
import { Workflow } from "@/components/landing/workflow";
import { TrustEngine } from "@/components/landing/trust-engine";
import { Audience } from "@/components/landing/audience";
import { CtaBand } from "@/components/landing/cta-band";

export default async function Page() {
  const session = await verifySession();
  if (session) {
    redirect("/dashboard");
  }

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
