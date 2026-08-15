"use server";

import { revalidatePath } from "next/cache";
import { queryOne, execute, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function toggleProjectProposalsStatus(
  projectId: number,
  newStatus: "open" | "closed"
) {
  const session = await verifySession();
  if (!session || (session.role !== "client" && !session.isAdmin)) {
    return { ok: false as const, error: "غير مصرح لك بتعديل حالة هذا المشروع" };
  }

  const project = await queryOne<{ id: number; client_id: number }>(
    `SELECT p.id, p.client_id 
     FROM projects p 
     JOIN clients c ON c.id = p.client_id 
     WHERE p.id = ? AND (c.user_id = ? OR ? = 1)`,
    [projectId, session.userId, session.isAdmin ? 1 : 0]
  );

  if (!project) {
    return { ok: false as const, error: "المشروع غير موجود أو ليس ملكك" };
  }

  await execute("UPDATE projects SET status = ? WHERE id = ?", [newStatus, projectId]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true as const, newStatus };
}

export async function cancelProject(projectId: number) {
  const session = await verifySession();
  if (!session || (session.role !== "client" && !session.isAdmin)) {
    return { ok: false as const, error: "غير مصرح لك بإلغاء هذا المشروع" };
  }

  const project = await queryOne<{ id: number; title: string; client_id: number }>(
    `SELECT p.id, p.title, p.client_id 
     FROM projects p 
     JOIN clients c ON c.id = p.client_id 
     WHERE p.id = ? AND (c.user_id = ? OR ? = 1)`,
    [projectId, session.userId, session.isAdmin ? 1 : 0]
  );

  if (!project) {
    return { ok: false as const, error: "المشروع غير موجود أو ليس ملكك" };
  }

  await execute("UPDATE projects SET status = 'closed' WHERE id = ?", [projectId]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteProject(projectId: number) {
  const session = await verifySession();
  if (!session || (session.role !== "client" && !session.isAdmin)) {
    return { ok: false as const, error: "غير مصرح لك بحذف هذا المشروع" };
  }

  const project = await queryOne<{ id: number; client_id: number }>(
    `SELECT p.id, p.client_id 
     FROM projects p 
     JOIN clients c ON c.id = p.client_id 
     WHERE p.id = ? AND (c.user_id = ? OR ? = 1)`,
    [projectId, session.userId, session.isAdmin ? 1 : 0]
  );

  if (!project) {
    return { ok: false as const, error: "المشروع غير موجود أو ليس ملكك" };
  }

  await transaction(async (conn) => {
    await conn.execute("DELETE FROM proposals WHERE project_id = ?", [projectId]);
    await conn.execute("DELETE FROM projects WHERE id = ?", [projectId]);
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
