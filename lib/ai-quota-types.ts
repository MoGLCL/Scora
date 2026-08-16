export type SubscriptionPlan = "free" | "pro" | "vip";

export interface PlanLimits {
  name: string;
  nameAr: string;
  badgeAr?: string;
  dailyRequests: number;
  weeklyRequests: number;
  trialDays: number;
  priceEgp: {
    developer: number;
    client: number;
  };
  // Platform Wide Capabilities:
  proposalsMonthlyLimit: number;
  projectsMonthlyLimit: number;
  portfolioProjectsLimit: number;
  commissionDiscountPercent: number;
  skillsAssessmentsMonthlyLimit: number;
  hasDirectChatWithClients: boolean;
  hasPriorityPlacement: boolean;
  hasVerifiedBadge: boolean;
  hasDedicatedSupport: boolean;
}

export const DEFAULT_PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    name: "Free",
    nameAr: "المجانية",
    badgeAr: "البداية المجانية",
    dailyRequests: 10,
    weeklyRequests: 30,
    trialDays: 3,
    priceEgp: { developer: 0, client: 0 },
    proposalsMonthlyLimit: 10,
    projectsMonthlyLimit: 1,
    portfolioProjectsLimit: 3,
    commissionDiscountPercent: 0,
    skillsAssessmentsMonthlyLimit: 2,
    hasDirectChatWithClients: true,
    hasPriorityPlacement: false,
    hasVerifiedBadge: false,
    hasDedicatedSupport: false,
  },
  pro: {
    name: "Pro",
    nameAr: "الاحترافية (Pro)",
    badgeAr: "الأكثر طلباً",
    dailyRequests: 50,
    weeklyRequests: 250,
    trialDays: 0,
    priceEgp: { developer: 249, client: 799 },
    proposalsMonthlyLimit: 50,
    projectsMonthlyLimit: 15,
    portfolioProjectsLimit: 20,
    commissionDiscountPercent: 30,
    skillsAssessmentsMonthlyLimit: 10,
    hasDirectChatWithClients: true,
    hasPriorityPlacement: true,
    hasVerifiedBadge: true,
    hasDedicatedSupport: false,
  },
  vip: {
    name: "VIP",
    nameAr: "المميزة (VIP)",
    badgeAr: "لكبار المحترفين والشركات",
    dailyRequests: 200,
    weeklyRequests: 1000,
    trialDays: 0,
    priceEgp: { developer: 599, client: 1999 },
    proposalsMonthlyLimit: 9999, // unlimited
    projectsMonthlyLimit: 9999,  // unlimited
    portfolioProjectsLimit: 9999, // unlimited
    commissionDiscountPercent: 60,
    skillsAssessmentsMonthlyLimit: 9999, // unlimited
    hasDirectChatWithClients: true,
    hasPriorityPlacement: true,
    hasVerifiedBadge: true,
    hasDedicatedSupport: true,
  },
};

export const PLAN_LIMITS = DEFAULT_PLAN_LIMITS;

export interface UserSubscriptionDetails {
  userId: number;
  plan: SubscriptionPlan;
  status: "active" | "expired" | "cancelled" | "trial";
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  dailyRequestsLimit: number;
  weeklyRequestsLimit: number;
  usedToday: number;
  usedThisWeek: number;
  remainingToday: number;
  remainingThisWeek: number;
  canUseAi: boolean;
  blockReason: string | null;
}
