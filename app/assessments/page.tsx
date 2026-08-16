import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query, queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { DeveloperAssessmentHub, type SkillItem, type PastAssessmentSession } from "@/components/developer-assessment-hub";
import { readJsonValue } from "@/lib/json-value";

export default async function AssessmentsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (session.role !== "developer") redirect("/dashboard");

  const dev = await queryOne<{
    id: number;
    job_title: string | null;
    trust_score: number;
    skill_points: number;
    approval_status: string;
  }>("SELECT id, job_title, trust_score, skill_points, approval_status FROM developers WHERE user_id = ?", [
    session.userId,
  ]);

  if (!dev) redirect("/complete-profile");

  // Fetch developer skills
  const devSkills = await query<SkillItem>(
    `SELECT s.id, s.name, ds.level, ds.sp 
     FROM developer_skills ds 
     JOIN skills s ON s.id = ds.skill_id 
     WHERE ds.developer_id = ? 
     ORDER BY ds.sp DESC, s.name ASC`,
    [dev.id]
  );

  // Fetch past assessment sessions
  const sessionRows = await query<{
    id: number;
    public_id: string;
    status: string;
    score: number | null;
    trust_awarded: number | null;
    sp_awarded: number | null;
    started_at: Date;
    submitted_at: Date | null;
    model: string | null;
    prompt_json: unknown;
  }>(
    `SELECT id, public_id, status, score, trust_awarded, sp_awarded, started_at, submitted_at, model, prompt_json 
     FROM developer_assessment_sessions 
     WHERE developer_id = ? 
     ORDER BY id DESC`,
    [dev.id]
  );

  const sessionIds = sessionRows.map((s) => s.id);
  const questionsSkills = sessionIds.length > 0
    ? await query<{ session_id: number; skill: string }>(
        `SELECT DISTINCT session_id, skill FROM developer_assessment_questions WHERE session_id IN (${sessionIds.join(",")})`
      )
    : [];

  const sessionSkillsMap = new Map<number, string[]>();
  for (const q of questionsSkills) {
    const list = sessionSkillsMap.get(q.session_id) || [];
    if (!list.includes(q.skill)) list.push(q.skill);
    sessionSkillsMap.set(q.session_id, list);
  }

  const pastSessions: PastAssessmentSession[] = sessionRows.map((row) => {
    const promptData = readJsonValue<{ track?: string; skills?: string[] }>(row.prompt_json);
    const skillsList = sessionSkillsMap.get(row.id) || promptData?.skills || [];

    return {
      id: row.id,
      publicId: row.public_id,
      status: row.status,
      track: promptData?.track || dev.job_title || "تقييم مهارات برمجية",
      score: row.score,
      trustAwarded: row.trust_awarded,
      spAwarded: row.sp_awarded,
      startedAt: new Date(row.started_at).toISOString(),
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      model: row.model,
      skills: skillsList,
    };
  });

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-10">
        <DeveloperAssessmentHub
          currentTrack={dev.job_title || "Full-Stack Web Developer"}
          developerSkills={devSkills}
          pastSessions={pastSessions}
          totalTrust={dev.trust_score || 50}
          totalSp={dev.skill_points || 0}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
