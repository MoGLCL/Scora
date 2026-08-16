import { NextResponse } from "next/server";
import { getSubscriptionPlansConfig } from "@/lib/ai-quota";

export async function GET() {
  try {
    const plans = await getSubscriptionPlansConfig();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[api/plans] Error fetching plans:", error);
    return NextResponse.json({ error: "FAILED_TO_FETCH_PLANS" }, { status: 500 });
  }
}
