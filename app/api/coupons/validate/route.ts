import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import { PLAN_LIMITS, type SubscriptionPlan } from "@/lib/ai-quota";

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  const schema = z.object({
    code: z.string().trim().min(1).max(50),
    plan: z.enum(["pro", "vip"]),
    userRole: z.enum(["developer", "client"]).optional(),
  });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "بيانات غير صالحة" }, { status: 400 });
  }

  const { code, plan } = parsed.data;
  const role = parsed.data.userRole || (session.role === "client" ? "client" : "developer");
  const basePrice = PLAN_LIMITS[plan].priceEgp[role];

  try {
    const coupon = await queryOne<{
      id: number;
      code: string;
      description: string | null;
      discount_type: "percentage" | "fixed" | "free";
      discount_value: number;
      applicable_plan: "all" | "pro" | "vip";
      duration_days: number;
      max_uses: number | null;
      used_count: number;
      is_active: number;
      expires_at: Date | string | null;
    }>(
      `SELECT id, code, description, discount_type, discount_value, applicable_plan, duration_days, max_uses, used_count, is_active, expires_at
       FROM coupons
       WHERE BINARY UPPER(code) = UPPER(?)`,
      [code.trim()]
    );

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "NOT_FOUND", message: "كوبون الخصم غير صحيح أو غير موجود" },
        { status: 404 }
      );
    }

    if (!coupon.is_active) {
      return NextResponse.json(
        { valid: false, error: "INACTIVE", message: "هذا الكوبون غير مفعّل حالياً" },
        { status: 400 }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, error: "EXPIRED", message: "هذا الكوبون منتهي الصلاحية" },
        { status: 400 }
      );
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { valid: false, error: "LIMIT_REACHED", message: "تم استنفاد الحد الأقصى لاستخدام هذا الكوبون" },
        { status: 400 }
      );
    }

    if (coupon.applicable_plan !== "all" && coupon.applicable_plan !== plan) {
      return NextResponse.json(
        {
          valid: false,
          error: "PLAN_MISMATCH",
          message: `هذا الكوبون صالح فقط لباقة ${PLAN_LIMITS[coupon.applicable_plan as SubscriptionPlan]?.nameAr ?? coupon.applicable_plan}`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    let finalPrice = basePrice;
    let isFree = false;

    if (coupon.discount_type === "free" || Number(coupon.discount_value) >= 100 && coupon.discount_type === "percentage") {
      isFree = true;
      discountAmount = basePrice;
      finalPrice = 0;
    } else if (coupon.discount_type === "percentage") {
      const pct = Math.min(100, Math.max(0, Number(coupon.discount_value)));
      discountAmount = Math.round((basePrice * pct) / 100);
      finalPrice = Math.max(0, basePrice - discountAmount);
      if (finalPrice === 0) isFree = true;
    } else if (coupon.discount_type === "fixed") {
      discountAmount = Math.min(basePrice, Number(coupon.discount_value));
      finalPrice = Math.max(0, basePrice - discountAmount);
      if (finalPrice === 0) isFree = true;
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: Number(coupon.discount_value),
        durationDays: coupon.duration_days,
        basePrice,
        discountAmount,
        finalPrice,
        isFree,
      },
      message: isFree
        ? "تم تطبيق الكوبون المجاني بنجاح (100% مجاناً)!"
        : `تم تطبيق الخصم بنجاح! السعر بعد الخصم: ${finalPrice} ج.م`,
    });
  } catch (error) {
    console.error("[coupons-validate]", error);
    return NextResponse.json({ valid: false, error: "SERVER_ERROR", message: "حدث خطأ أثناء فحص الكوبون" }, { status: 500 });
  }
}
