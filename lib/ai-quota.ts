import "server-only";

import { queryOne, execute } from "@/lib/db";
import {
  type SubscriptionPlan,
  type PlanLimits,
  DEFAULT_PLAN_LIMITS,
  PLAN_LIMITS,
  type UserSubscriptionDetails,
} from "./ai-quota-types";

export type { SubscriptionPlan, PlanLimits, UserSubscriptionDetails };
export { DEFAULT_PLAN_LIMITS, PLAN_LIMITS };

/**
 * Retrieve dynamic subscription plans configured by Admin, falling back to defaults.
 */
export async function getSubscriptionPlansConfig(): Promise<Record<SubscriptionPlan, PlanLimits>> {
  try {
    const row = await queryOne<{ setting_value: string }>(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'subscription_plans_config'"
    );
    if (row?.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      return {
        free: { ...DEFAULT_PLAN_LIMITS.free, ...parsed.free },
        pro: { ...DEFAULT_PLAN_LIMITS.pro, ...parsed.pro },
        vip: { ...DEFAULT_PLAN_LIMITS.vip, ...parsed.vip },
      };
    }
  } catch (err) {
    console.error("[ai-quota] Error reading plans config:", err);
  }
  return DEFAULT_PLAN_LIMITS;
}

/**
 * Save updated subscription plans configuration to database
 */
export async function saveSubscriptionPlansConfig(
  plans: Record<SubscriptionPlan, PlanLimits>
): Promise<boolean> {
  try {
    await execute(
      `INSERT INTO platform_settings (setting_key, setting_value)
       VALUES ('subscription_plans_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(plans)]
    );
    return true;
  } catch (err) {
    console.error("[ai-quota] Error saving plans config:", err);
    return false;
  }
}

/**
 * Get or initialize a user's subscription and calculate their real-time AI quota
 */
export async function getUserSubscriptionDetails(userId: number): Promise<UserSubscriptionDetails> {
  const plansConfig = await getSubscriptionPlansConfig();

  // 1. Get or create subscription
  let sub = await queryOne<{
    id: number;
    user_id: number;
    plan: SubscriptionPlan;
    status: string;
    trial_ends_at: Date | string | null;
    current_period_start: Date | string;
    current_period_end: Date | string | null;
    user_created_at: Date | string;
  }>(
    `SELECT s.id, s.user_id, s.plan, s.status, s.trial_ends_at, s.current_period_start, s.current_period_end, u.created_at AS user_created_at
     FROM users u
     LEFT JOIN user_subscriptions s ON s.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );

  if (!sub || !sub.plan) {
    // If not found in subscriptions table, insert default Free with 3 days trial
    await execute(
      `INSERT IGNORE INTO user_subscriptions (user_id, plan, status, trial_ends_at, current_period_start)
       SELECT id, 'free', 'trial', DATE_ADD(created_at, INTERVAL 3 DAY), created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    sub = await queryOne<{
      id: number;
      user_id: number;
      plan: SubscriptionPlan;
      status: string;
      trial_ends_at: Date | string | null;
      current_period_start: Date | string;
      current_period_end: Date | string | null;
      user_created_at: Date | string;
    }>(
      `SELECT s.id, s.user_id, s.plan, s.status, s.trial_ends_at, s.current_period_start, s.current_period_end, u.created_at AS user_created_at
       FROM users u
       JOIN user_subscriptions s ON s.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );
  }

  const plan = (sub?.plan || "free") as SubscriptionPlan;
  const limits = plansConfig[plan] || DEFAULT_PLAN_LIMITS[plan];

  const now = new Date();
  let trialEndsAtDate: Date | null = null;
  if (sub?.trial_ends_at) {
    trialEndsAtDate = new Date(sub.trial_ends_at);
  } else if (sub?.user_created_at) {
    trialEndsAtDate = new Date(new Date(sub.user_created_at).getTime() + (limits.trialDays || 3) * 24 * 60 * 60 * 1000);
  }

  const isFreePlan = plan === "free";
  const isTrialExpired = isFreePlan && trialEndsAtDate ? now.getTime() > trialEndsAtDate.getTime() : false;
  const trialTimeLeft = trialEndsAtDate ? Math.max(0, trialEndsAtDate.getTime() - now.getTime()) : 0;
  const trialDaysLeft = Math.ceil(trialTimeLeft / (1000 * 60 * 60 * 24));

  // 2. Query usage for today and this week
  const [todayUsage, weekUsage] = await Promise.all([
    queryOne<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM ai_usage_logs
       WHERE user_id = ? AND created_at >= CURDATE()`,
      [userId]
    ),
    queryOne<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM ai_usage_logs
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [userId]
    ),
  ]);

  const usedToday = todayUsage?.cnt ?? 0;
  const usedThisWeek = weekUsage?.cnt ?? 0;
  const remainingToday = Math.max(0, limits.dailyRequests - usedToday);
  const remainingThisWeek = Math.max(0, limits.weeklyRequests - usedThisWeek);

  let canUseAi = true;
  let blockReason: string | null = null;

  if (isFreePlan && isTrialExpired) {
    canUseAi = false;
    blockReason = "TRIAL_EXPIRED";
  } else if (remainingToday <= 0) {
    canUseAi = false;
    blockReason = "DAILY_LIMIT_REACHED";
  } else if (remainingThisWeek <= 0) {
    canUseAi = false;
    blockReason = "WEEKLY_LIMIT_REACHED";
  }

  return {
    userId,
    plan,
    status: isTrialExpired ? "expired" : (sub?.status as UserSubscriptionDetails["status"] || "active"),
    trialEndsAt: trialEndsAtDate ? trialEndsAtDate.toISOString() : null,
    currentPeriodStart: sub?.current_period_start ? new Date(sub.current_period_start).toISOString() : new Date().toISOString(),
    currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end).toISOString() : null,
    isTrial: isFreePlan && !isTrialExpired,
    isTrialExpired,
    trialDaysLeft,
    dailyRequestsLimit: limits.dailyRequests,
    weeklyRequestsLimit: limits.weeklyRequests,
    usedToday,
    usedThisWeek,
    remainingToday,
    remainingThisWeek,
    canUseAi,
    blockReason,
  };
}

/**
 * Check if the user is allowed to send an AI message right now
 */
export async function checkAiQuota(userId: number): Promise<{
  allowed: boolean;
  message?: string;
  reason?: string;
  details: UserSubscriptionDetails;
}> {
  const details = await getUserSubscriptionDetails(userId);
  const plansConfig = await getSubscriptionPlansConfig();

  if (!details.canUseAi) {
    if (details.blockReason === "TRIAL_EXPIRED") {
      return {
        allowed: false,
        reason: "TRIAL_EXPIRED",
        message:
          "انتهت الفترة التجريبية المجانية لـ SSD AI Agent. قم بترقية حسابك إلى باقة Pro أو VIP للاستمرار في الاستمتاع بكافة إمكانيات الوكيل الذكي.",
        details,
      };
    }
    if (details.blockReason === "DAILY_LIMIT_REACHED") {
      return {
        allowed: false,
        reason: "DAILY_LIMIT_REACHED",
        message: `لقد استهلكت كامل الحد اليومي لطلبات الذكاء الاصطناعي (${details.dailyRequestsLimit} طلب/يوم) في باقتك الحالية (${plansConfig[details.plan]?.nameAr || details.plan}). سيتجدد رصيدك تلقائياً غداً أو يمكنك الترقية لباقة أعلى.`,
        details,
      };
    }
    if (details.blockReason === "WEEKLY_LIMIT_REACHED") {
      return {
        allowed: false,
        reason: "WEEKLY_LIMIT_REACHED",
        message: `لقد استهلكت كامل الحد الأسبوعي لطلبات الذكاء الاصطناعي (${details.weeklyRequestsLimit} طلب/أسبوع) في باقتك الحالية (${plansConfig[details.plan]?.nameAr || details.plan}). يمكنك الترقية لباقة VIP لمضاعفة سعتك.`,
        details,
      };
    }
  }

  return {
    allowed: true,
    details,
  };
}

/**
 * Log an AI request into ai_usage_logs
 */
export async function logAiUsage(
  userId: number,
  model?: string,
  promptTokens = 0,
  responseTokens = 0
): Promise<void> {
  try {
    await execute(
      `INSERT INTO ai_usage_logs (user_id, model, prompt_tokens, response_tokens, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, model || "openrouter/auto", promptTokens, responseTokens]
    );
  } catch (error) {
    console.error("[ai-quota] Failed to log AI usage:", error);
  }
}
