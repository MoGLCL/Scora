import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { queryOne, execute } from "@/lib/db";
import { getUserSubscriptionDetails, getSubscriptionPlansConfig } from "@/lib/ai-quota";

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً للترقية" }, { status: 401 });
  }

  const schema = z.object({
    plan: z.enum(["pro", "vip"]),
    couponCode: z.string().trim().max(50).optional().nullable(),
  });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "بيانات الترقية غير صالحة" }, { status: 400 });
  }

  const { plan, couponCode } = parsed.data;
  const role = session.role === "client" ? "client" : "developer";
  const plansConfig = await getSubscriptionPlansConfig();
  const basePrice = plansConfig[plan]?.priceEgp[role] ?? 0;

  try {
    let discountAmount = 0;
    let durationDays = 30;

    if (couponCode && couponCode.trim()) {
      const coupon = await queryOne<{
        id: number;
        code: string;
        discount_type: "percentage" | "fixed" | "free";
        discount_value: number;
        applicable_plan: "all" | "pro" | "vip";
        duration_days: number;
        max_uses: number | null;
        used_count: number;
        is_active: number;
        expires_at: Date | string | null;
      }>(
        `SELECT id, code, discount_type, discount_value, applicable_plan, duration_days, max_uses, used_count, is_active, expires_at
         FROM coupons
         WHERE BINARY UPPER(code) = UPPER(?)`,
        [couponCode.trim()]
      );

      if (!coupon || !coupon.is_active) {
        return NextResponse.json({ error: "INVALID_COUPON", message: "كوبون الخصم غير صالح أو غير مفعّل" }, { status: 400 });
      }

      if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: "COUPON_EXPIRED", message: "كوبون الخصم منتهي الصلاحية" }, { status: 400 });
      }

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json({ error: "COUPON_LIMIT_REACHED", message: "تم استنفاد الحد الأقصى لاستخدام الكوبون" }, { status: 400 });
      }

      if (coupon.applicable_plan !== "all" && coupon.applicable_plan !== plan) {
        return NextResponse.json({ error: "PLAN_MISMATCH", message: "هذا الكوبون غير مخصص لهذه الباقة" }, { status: 400 });
      }

      durationDays = coupon.duration_days || 30;

      if (coupon.discount_type === "free" || Number(coupon.discount_value) >= 100 && coupon.discount_type === "percentage") {
        discountAmount = basePrice;
      } else if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((basePrice * Number(coupon.discount_value)) / 100);
      } else {
        discountAmount = Math.min(basePrice, Number(coupon.discount_value));
      }

      // Record coupon usage
      await execute("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [coupon.id]);
      await execute(
        `INSERT INTO coupon_redemptions (coupon_id, user_id, plan_applied, discount_amount, redeemed_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [coupon.id, session.userId, plan, discountAmount]
      );
    }

    // Upsert or update user subscription
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await execute(
      `INSERT INTO user_subscriptions (user_id, plan, status, current_period_start, current_period_end, coupon_code)
       VALUES (?, ?, 'active', NOW(), ?, ?)
       ON DUPLICATE KEY UPDATE
         plan = VALUES(plan),
         status = 'active',
         current_period_start = NOW(),
         current_period_end = VALUES(current_period_end),
         coupon_code = VALUES(coupon_code),
         updated_at = NOW()`,
      [session.userId, plan, periodEnd, couponCode?.trim() || null]
    );

    // Send a confirmation notification to the user
    await execute(
      `INSERT INTO notifications (user_id, body, link_url, is_read, created_at)
       VALUES (?, ?, '/pricing', 0, NOW())`,
      [
        session.userId,
        `مبروك! تم تفعيل اشتراكك في باقة ${plansConfig[plan].nameAr} بنجاح. استمتع بسعة ${plansConfig[plan].dailyRequests} طلب/يوم لـ SSD AI Agent ومميزات المنصة الكاملة.`,
      ]
    );

    const updatedDetails = await getUserSubscriptionDetails(session.userId);

    return NextResponse.json({
      success: true,
      message: `تم ترقية وتفعيل باقة ${plansConfig[plan].nameAr} لحسابك بنجاح!`,
      subscription: updatedDetails,
    });
  } catch (error) {
    console.error("[subscriptions-subscribe]", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "حدث خطأ أثناء تفعيل الاشتراك" }, { status: 500 });
  }
}
