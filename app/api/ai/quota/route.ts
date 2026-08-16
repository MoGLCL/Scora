import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import { getUserSubscriptionDetails } from "@/lib/ai-quota";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (session.role === "developer") {
    const dev = await queryOne<{ approval_status: string }>(
      "SELECT approval_status FROM developers WHERE user_id=?",
      [session.userId]
    );
    if (dev?.approval_status !== "approved") {
      return NextResponse.json(
        {
          error: "DEVELOPER_NOT_APPROVED",
          message: "مساعد SSD متاح بعد إكمال التقييم البرمجي واعتماد حسابك من الإدارة.",
        },
        { status: 403 }
      );
    }
  }

  try {
    const details = await getUserSubscriptionDetails(session.userId);
    return NextResponse.json(details);
  } catch (error) {
    console.error("[ai-quota-api]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
