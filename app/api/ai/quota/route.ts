import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { getUserSubscriptionDetails } from "@/lib/ai-quota";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const details = await getUserSubscriptionDetails(session.userId);
    return NextResponse.json(details);
  } catch (error) {
    console.error("[ai-quota-api]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
