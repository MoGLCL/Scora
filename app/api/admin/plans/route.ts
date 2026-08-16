import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { getSubscriptionPlansConfig, saveSubscriptionPlansConfig } from "@/lib/ai-quota";
import { DEFAULT_PLAN_LIMITS, type PlanLimits, type SubscriptionPlan } from "@/lib/ai-quota-types";
import { z } from "zod";

const PlanSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  badgeAr: z.string().optional(),
  dailyRequests: z.number().int().min(1),
  weeklyRequests: z.number().int().min(1),
  trialDays: z.number().int().min(0),
  priceEgp: z.object({
    developer: z.number().min(0),
    client: z.number().min(0),
  }),
  proposalsMonthlyLimit: z.number().int().min(1),
  projectsMonthlyLimit: z.number().int().min(1),
  portfolioProjectsLimit: z.number().int().min(1),
  commissionDiscountPercent: z.number().min(0).max(100),
  skillsAssessmentsMonthlyLimit: z.number().int().min(1),
  hasDirectChatWithClients: z.boolean(),
  hasPriorityPlacement: z.boolean(),
  hasVerifiedBadge: z.boolean(),
  hasDedicatedSupport: z.boolean(),
});

const PlansConfigSchema = z.object({
  free: PlanSchema,
  pro: PlanSchema,
  vip: PlanSchema,
});

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const plans = await getSubscriptionPlansConfig();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[api/admin/plans] Error fetching plans:", error);
    return NextResponse.json({ error: "FAILED_TO_FETCH_PLANS" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PlansConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PLANS_CONFIG", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const success = await saveSubscriptionPlansConfig(parsed.data as Record<SubscriptionPlan, PlanLimits>);
    if (!success) throw new Error("Database update failed");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/plans] Error saving plans:", error);
    return NextResponse.json({ error: "FAILED_TO_SAVE_PLANS" }, { status: 500 });
  }
}

export async function PUT() {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Reset to default plans
  try {
    const success = await saveSubscriptionPlansConfig(DEFAULT_PLAN_LIMITS);
    if (!success) throw new Error("Database reset failed");
    return NextResponse.json({ success: true, plans: DEFAULT_PLAN_LIMITS });
  } catch (error) {
    console.error("[api/admin/plans] Error resetting plans:", error);
    return NextResponse.json({ error: "FAILED_TO_RESET_PLANS" }, { status: 500 });
  }
}
