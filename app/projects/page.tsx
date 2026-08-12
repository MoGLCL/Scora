import { listProjects } from "@/lib/dal";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  return <ProjectsClient projects={await listProjects()} />;
}
