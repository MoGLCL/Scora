import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== "admin") redirect("/login");
  return children;
}
