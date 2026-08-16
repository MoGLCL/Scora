import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const tickets = await query<{
    id: number;
    user_id: number;
    reported_user_id: number | null;
    category: string;
    subject: string;
    description: string;
    status: string;
    created_at: Date;
    user_name: string;
    user_email: string;
    user_role: string;
    reported_user_name: string | null;
    reported_user_email: string | null;
  }>(`
    SELECT 
      st.id, st.user_id, st.reported_user_id, st.category, st.subject, st.description, st.status, st.created_at,
      u.full_name as user_name, u.email as user_email, u.role as user_role,
      ru.full_name as reported_user_name, ru.email as reported_user_email
    FROM support_tickets st
    JOIN users u ON u.id = st.user_id
    LEFT JOIN users ru ON ru.id = st.reported_user_id
    ORDER BY st.id DESC
    LIMIT 100
  `);

  return NextResponse.json(
    tickets.map((t) => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      userEmail: t.user_email,
      userRole: t.user_role,
      reportedUserId: t.reported_user_id,
      reportedUserName: t.reported_user_name,
      reportedUserEmail: t.reported_user_email,
      category: t.category,
      subject: t.subject,
      description: t.description,
      status: t.status,
      createdAt: new Date(t.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }))
  );
}
