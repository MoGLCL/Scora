import { notFound } from "next/navigation";
import { getProjectDetail, getProposalFeed } from "@/lib/dal";
import { ProjectDetailClient } from "./project-detail-client";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const projectId = Number((await params).id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const project = await getProjectDetail(projectId);
  if (!project) notFound();
  return <ProjectDetailClient project={project} initialProposals={await getProposalFeed(projectId)} />;
}
