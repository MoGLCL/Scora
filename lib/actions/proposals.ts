"use server";

import { revalidatePath } from "next/cache";
import { queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

// WITTY & HUMOROUS REJECTION MESSAGES (EGYPTIAN DEVELOPER TECH HUMOR - NO EMOJIS)
const FUNNY_REJECTION_MESSAGES = [
  (title: string) =>
    `العميل قال: "الكود بتاعك شكله Production وإحنا لسه بنجرب Local".. متقلقش يا باشمهندس، مشروع: "${title}" راح وهيجي غيره أحسن بكتير!`,
  (title: string) =>
    `حصل Merge Conflict في النصيب مع مشروع: "${title}".. جهز الـ Commit الجاي والفرصة الأقوى في السكة!`,
  (title: string) =>
    `العميل عمل Rollback لعرضك في مشروع: "${title}".. بس ولا يهمك يا بطل، الـ Senior الحقيقي بيقوم من الـ 404 أقوى!`,
  (title: string) =>
    `شكله كان محتاج حد يعمل المشروع بـ HTML بس وأنت كودك تقيل عليه.. عرضك في مشروع: "${title}" مترفضش، هو بس مش قد مستواك!`,
  (title: string) =>
    `Status Code: 418 I'm a Teapot.. العميل قرر يروح في سكة تانية في مشروع: "${title}"، بس سكورا معاك ومشاريع تانية مستنياك!`,
  (title: string) =>
    `العميل عمل git reset --hard للنصيب.. خيرها في غيرها في مشروع: "${title}"، افتح شاي بالنعناع وقدم على مشروع تاني!`,
  (title: string) =>
    `العميل كتب TODO: هختار مطور تاني.. عرضك في مشروع: "${title}" متمش، بس الـ Pull Request الجاي بتاعك ومفيش كلام!`,
  (title: string) =>
    `العميل قفل الـ Socket يا فنان.. فداك مشروع: "${title}"، خش صفحة المشاريع ودوس في اللي بعده!`,
  (title: string) =>
    `Stack Overflow بيقولك: الرفض ده مجرد Bug في خوارزمية العميل.. عرضك لمشروع: "${title}" تم رفضه، دوس في اللي بعده يا بطل!`
];

function getRandomFunnyRejectionMessage(title: string) {
  const index = Math.floor(Math.random() * FUNNY_REJECTION_MESSAGES.length);
  return FUNNY_REJECTION_MESSAGES[index](title);
}

interface OwnedProposal {
  id: number;
  project_id: number;
  developer_user_id: number;
  project_title: string;
  developer_username: string | null;
  developer_name: string;
}

async function findOwnedProposal(input: {
  proposalId: number;
  ownerUserId: number;
  isAdmin: boolean;
  statuses: Array<"pending" | "rejected">;
  requireOpenProject?: boolean;
}): Promise<OwnedProposal | null> {
  const statusPlaceholders = input.statuses.map(() => "?").join(",");
  const openProjectClause = input.requireOpenProject ? "AND p.status='open'" : "";

  return queryOne<OwnedProposal>(
    `SELECT pr.id, pr.project_id, d.user_id developer_user_id, p.title project_title,
            u.username developer_username, d.display_name developer_name
     FROM proposals pr
     JOIN projects p ON p.id=pr.project_id
     JOIN clients c ON c.id=p.client_id
     JOIN developers d ON d.id=pr.developer_id
     JOIN users u ON u.id=d.user_id
     WHERE pr.id=? AND (c.user_id=? OR ?=1)
       AND pr.status IN (${statusPlaceholders}) ${openProjectClause}`,
    [input.proposalId, input.ownerUserId, input.isAdmin ? 1 : 0, ...input.statuses]
  );
}

function revalidateProposalProject(projectId: number) {
  revalidatePath(`/projects/${projectId}/proposals`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function acceptProposal(proposalId: number) {
  const s = await verifySession();
  if (!s || (s.role !== "client" && !s.isAdmin)) {
    return { ok: false as const, error: "غير مصرح" };
  }

  const row = await findOwnedProposal({
    proposalId,
    ownerUserId: s.userId,
    isAdmin: s.isAdmin,
    statuses: ["pending", "rejected"],
    requireOpenProject: true,
  });

  if (!row) {
    return { ok: false as const, error: "العرض غير موجود أو المشروع ليس مفتوحاً أو تم توظيف مطور بالفعل" };
  }

  await transaction(async (c) => {
    await c.execute(
      "UPDATE proposals SET status='accepted' WHERE id=?",
      [row.id]
    );
    await c.execute("UPDATE projects SET status='in_progress' WHERE id=? AND status='open'", [row.project_id]);

    await c.execute(
      "INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)",
      [
        row.developer_user_id,
        `تهانينا! تم قبول عرضك وتوظيفك في مشروع: "${row.project_title}". تواصل مع العميل لبدء التنفيذ.`,
        `/projects/${row.project_id}`
      ]
    );
  });

  revalidateProposalProject(row.project_id);
  return {
    ok: true as const,
    developerUsername: row.developer_username ?? String(row.developer_user_id),
    developerName: row.developer_name,
  };
}

export async function unhireDeveloper(projectId: number) {
  const s = await verifySession();
  if (!s || (s.role !== "client" && !s.isAdmin)) {
    return { ok: false as const, error: "غير مصرح" };
  }

  const project = await queryOne<{
    id: number;
    title: string;
    developer_user_id: number | null;
  }>(
    `SELECT p.id, p.title, d.user_id AS developer_user_id
     FROM projects p
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN proposals pr ON pr.project_id = p.id AND pr.status = 'accepted'
     LEFT JOIN developers d ON d.id = pr.developer_id
     WHERE p.id = ? AND (c.user_id = ? OR ? = 1)`,
    [projectId, s.userId, s.isAdmin ? 1 : 0]
  );

  if (!project) {
    return { ok: false as const, error: "المشروع غير موجود أو ليس ملكك" };
  }

  await transaction(async (c) => {
    // Reset accepted proposals back to pending
    await c.execute(
      "UPDATE proposals SET status='pending' WHERE project_id=? AND status='accepted'",
      [projectId]
    );
    // Reopen project for bidding
    await c.execute("UPDATE projects SET status='open' WHERE id=?", [projectId]);

    if (project.developer_user_id) {
      await c.execute(
        "INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)",
        [
          project.developer_user_id,
          `تم إلغاء التوظيف وإعادة فتح اختيار العروض في مشروع: "${project.title}".`,
          `/projects/${projectId}`
        ]
      );
    }
  });

  revalidateProposalProject(projectId);
  return { ok: true as const };
}

export async function rejectProposal(proposalId: number) {
  const s = await verifySession();
  if (!s || (s.role !== "client" && !s.isAdmin)) {
    return { ok: false as const, error: "غير مصرح" };
  }

  const row = await findOwnedProposal({
    proposalId,
    ownerUserId: s.userId,
    isAdmin: s.isAdmin,
    statuses: ["pending"],
  });

  if (!row) {
    return { ok: false as const, error: "العرض غير موجود أو ليس ملكك" };
  }

  const funnyMessage = getRandomFunnyRejectionMessage(row.project_title);

  await transaction(async (c) => {
    await c.execute("UPDATE proposals SET status='rejected' WHERE id=?", [proposalId]);
    await c.execute(
      "INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)",
      [row.developer_user_id, funnyMessage, `/projects/${row.project_id}`]
    );
  });

  revalidateProposalProject(row.project_id);
  return { ok: true as const };
}

export async function undoRejectProposal(proposalId: number) {
  const s = await verifySession();
  if (!s || (s.role !== "client" && !s.isAdmin)) {
    return { ok: false as const, error: "غير مصرح" };
  }

  const row = await findOwnedProposal({
    proposalId,
    ownerUserId: s.userId,
    isAdmin: s.isAdmin,
    statuses: ["rejected"],
  });

  if (!row) {
    return { ok: false as const, error: "العرض غير موجود أو لم يتم رفضه مسبقاً" };
  }

  await transaction(async (c) => {
    await c.execute("UPDATE proposals SET status='pending' WHERE id=?", [proposalId]);
    await c.execute(
      "INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)",
      [
        row.developer_user_id,
        `قام العميل بإلغاء الرفض وإعادة النظر في عرضك المتقدم على مشروع: "${row.project_title}".`,
        `/projects/${row.project_id}`
      ]
    );
  });

  revalidateProposalProject(row.project_id);
  return { ok: true as const };
}
