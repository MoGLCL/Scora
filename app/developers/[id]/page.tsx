import { notFound } from "next/navigation";
import { getDeveloperById, verifySession } from "@/lib/dal";
import { DeveloperProfileClient } from "./profile-client";

export default async function DeveloperPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const developer = await getDeveloperById(id);
  if (!developer) notFound();
  const session = await verifySession();
  return <DeveloperProfileClient developer={developer} isOwner={session?.userId === developer.user_id} />;
}
