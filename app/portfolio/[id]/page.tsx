import { notFound } from "next/navigation";
import { getPortfolioProject, verifySession } from "@/lib/dal";
import { PortfolioDetailClient } from "./portfolio-detail-client";

export default async function PortfolioProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const session = await verifySession();
  const project = await getPortfolioProject(id, session?.userId ?? null);
  if (!project) notFound();
  return <PortfolioDetailClient project={project} canReview={Boolean(session && session.userId !== project.developerUserId)} isOwner={session?.userId === project.developerUserId || Boolean(session?.isAdmin)} />;
}
