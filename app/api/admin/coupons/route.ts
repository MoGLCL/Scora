import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { query, queryOne, execute } from "@/lib/db";

// GET all coupons with usage stats
export async function GET() {
  const session = await verifySession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const coupons = await query<{
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
      expires_at: string | null;
      created_at: string;
    }>(
      `SELECT id, code, description, discount_type, discount_value, applicable_plan, duration_days, max_uses, used_count, is_active, expires_at, created_at
       FROM coupons
       ORDER BY id DESC`
    );

    const redemptions = await query<{
      id: number;
      coupon_code: string;
      user_name: string;
      user_email: string;
      plan_applied: string;
      discount_amount: number;
      redeemed_at: string;
    }>(
      `SELECT r.id, c.code AS coupon_code, u.full_name AS user_name, u.email AS user_email, r.plan_applied, r.discount_amount, r.redeemed_at
       FROM coupon_redemptions r
       JOIN coupons c ON c.id = r.coupon_id
       JOIN users u ON u.id = r.user_id
       ORDER BY r.id DESC
       LIMIT 50`
    );

    return NextResponse.json({ coupons, redemptions });
  } catch (error) {
    console.error("[admin-coupons-get]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

// POST create a new coupon
export async function POST(request: Request) {
  const session = await verifySession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const schema = z.object({
    code: z
      .string()
      .trim()
      .min(2, "رمز الكوبون يجب أن يكون حرفين على الأقل")
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/, "الرمز يجب أن يحتوي على أحرف وأرقام وشرطات فقط"),
    description: z.string().trim().max(255).optional().nullable(),
    discountType: z.enum(["percentage", "fixed", "free"]),
    discountValue: z.number().min(0),
    applicablePlan: z.enum(["all", "pro", "vip"]).default("all"),
    durationDays: z.number().int().min(1).default(30),
    maxUses: z.number().int().min(1).nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_DATA", message: parsed.error.issues[0]?.message || "بيانات غير صالحة" }, { status: 400 });
  }

  const { code, description, discountType, discountValue, applicablePlan, durationDays, maxUses, expiresAt, isActive } = parsed.data;

  try {
    const existing = await queryOne<{ id: number }>("SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)", [code]);
    if (existing) {
      return NextResponse.json({ error: "DUPLICATE_CODE", message: "رمز الكوبون هذا مستخدم بالفعل، اختر رمزاً آخر" }, { status: 400 });
    }

    const value = discountType === "free" ? 100 : discountValue;

    const result = await execute(
      `INSERT INTO coupons (code, description, discount_type, discount_value, applicable_plan, duration_days, max_uses, is_active, expires_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        code.toUpperCase(),
        description || null,
        discountType,
        value,
        applicablePlan,
        durationDays,
        maxUses || null,
        isActive ? 1 : 0,
        expiresAt ? new Date(expiresAt) : null,
        session.userId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الكوبون بنجاح!",
      couponId: result.insertId,
    });
  } catch (error) {
    console.error("[admin-coupons-post]", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "حدث خطأ أثناء حفظ الكوبون" }, { status: 500 });
  }
}

// PATCH toggle coupon active / inactive
export async function PATCH(request: Request) {
  const session = await verifySession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const schema = z.object({
    id: z.number().int(),
    isActive: z.boolean(),
  });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });
  }

  try {
    await execute("UPDATE coupons SET is_active = ?, updated_at = NOW() WHERE id = ?", [
      parsed.data.isActive ? 1 : 0,
      parsed.data.id,
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin-coupons-patch]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

// DELETE coupon
export async function DELETE(request: Request) {
  const session = await verifySession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get("id");
  const id = idStr ? parseInt(idStr, 10) : null;
  if (!id) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  try {
    await execute("DELETE FROM coupons WHERE id = ?", [id]);
    return NextResponse.json({ success: true, message: "تم حذف الكوبون بنجاح" });
  } catch (error) {
    console.error("[admin-coupons-delete]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
