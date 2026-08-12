import { listDevelopers } from "@/lib/dal";
import { DevelopersDirectoryClient } from "./developers-client";

export default async function DevelopersDirectoryPage() {
  return <DevelopersDirectoryClient developers={await listDevelopers()} />;
}
