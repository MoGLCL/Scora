import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (!session.onboardingCompleted) redirect(session.role === "developer" ? "/complete-profile" : "/complete-client-profile");
  if (!session.isAdmin) redirect("/dashboard");
  return children;
}
