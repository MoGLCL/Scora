"use client";

import { useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  Gift,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Percent,
  Coins,
} from "lucide-react";

interface CouponItem {
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
}

interface RedemptionItem {
  id: number;
  coupon_code: string;
  user_name: string;
  user_email: string;
  plan_applied: string;
  discount_amount: number;
  redeemed_at: string;
}

interface AdminCouponsTabProps {
  notify: (msg: string, type: "success" | "warn") => void;
}

export function AdminCouponsTab({ notify }: AdminCouponsTabProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed" | "free">("free");
  const [formValue, setFormValue] = useState<number>(100);
  const [formPlan, setFormPlan] = useState<"all" | "pro" | "vip">("all");
  const [formDays, setFormDays] = useState<number>(30);
  const [formMaxUses, setFormMaxUses] = useState<string>("");
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
        setRedemptions(data.redemptions || []);
      }
    } catch {
      notify("تعذر جلب بيانات الكوبونات", "warn");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    notify(`تم نسخ الكود: ${code}`, "success");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: currentActive ? 0 : 1 } : c))
        );
        notify(currentActive ? "تم تعطيل الكوبون" : "تم تفعيل الكوبون بنجاح", "success");
      }
    } catch {
      notify("تعذر تحديث حالة الكوبون", "warn");
    }
  };

  const handleDeleteCoupon = async (id: number, code: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف الكوبون (${code})؟`)) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        notify(`تم حذف الكوبون ${code} بنجاح`, "success");
      }
    } catch {
      notify("تعذر حذف الكوبون", "warn");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      notify("يرجى إدخال رمز الكوبون", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          description: formDesc.trim() || null,
          discountType: formType,
          discountValue: formType === "free" ? 100 : Number(formValue) || 0,
          applicablePlan: formPlan,
          durationDays: Number(formDays) || 30,
          maxUses: formMaxUses.trim() ? parseInt(formMaxUses.trim(), 10) : null,
          expiresAt: formExpiresAt || null,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "تعذر إنشاء الكوبون");
      }

      notify("تم إنشاء الكوبون بنجاح!", "success");
      setIsCreateOpen(false);
      // Reset form
      setFormCode("");
      setFormDesc("");
      setFormType("free");
      setFormValue(100);
      setFormPlan("all");
      setFormDays(30);
      setFormMaxUses("");
      setFormExpiresAt("");
      fetchCoupons();
    } catch (error) {
      notify(error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ", "warn");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active === 1).length;
  const freeCoupons = coupons.filter((c) => c.discount_type === "free").length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#04552D] text-white flex items-center justify-center shadow-xs">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#05291A]">
              إدارة كوبونات الخصم والرموز الترويجية
            </h2>
            <p className="text-xs text-[#526B5E]">
              أنشئ كوبونات خصم أو كوبونات تفعيل مجانية 100% وتابع إحصائيات استخدامها
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="h-11 px-5 rounded-2xl bg-[#056B38] hover:bg-[#08592E] text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كوبون جديد</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#D1E3D6] shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-[#526B5E] font-medium">إجمالي الكوبونات</span>
          <div className="text-2xl font-black text-[#05291A] font-mono mt-2">{totalCoupons}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#D1E3D6] shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-emerald-700 font-medium">الكوبونات النشطة</span>
          <div className="text-2xl font-black text-[#056B38] font-mono mt-2">{activeCoupons}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#D1E3D6] shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-amber-700 font-medium">كوبونات مجانية 100%</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-2">{freeCoupons}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#D1E3D6] shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-blue-700 font-medium">مرات الاستخدام والتفعيل</span>
          <div className="text-2xl font-black text-blue-800 font-mono mt-2">{totalRedemptions}</div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-[24px] border border-[#D1E3D6] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#D1E3D6] bg-neutral-50/70 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#05291A] flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#056B38]" />
            <span>قائمة الكوبونات النشطة والمنتهية</span>
          </h3>
          <span className="text-xs text-neutral-500 font-mono">{coupons.length} كوبون</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-neutral-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#056B38]" />
            <span className="text-xs font-bold">جاري تحميل الكوبونات...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-neutral-300" />
            <div className="text-sm font-bold text-neutral-600">لا توجد كوبونات خصم حالياً</div>
            <p className="text-xs text-neutral-400">
              اضغط على "إنشاء كوبون جديد" لإنشاء أول كود خصم أو تفعيل مجاني
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#E8FAF0] text-[#056B38] font-bold border-b border-[#D1E3D6]">
                <tr>
                  <th className="p-3.5 pr-5">رمز الكوبون</th>
                  <th className="p-3.5">نوع الخصم</th>
                  <th className="p-3.5">الباقة الموجهة</th>
                  <th className="p-3.5">المدة</th>
                  <th className="p-3.5">الاستخدام</th>
                  <th className="p-3.5">تاريخ الانتهاء</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 pl-5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1E3D6]">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now();
                  const isLimitReached = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;

                  return (
                    <tr key={coupon.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Code */}
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#05291A] bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="text-neutral-400 hover:text-[#056B38] transition-colors cursor-pointer"
                            title="نسخ الرمز"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <div className="text-[11px] text-neutral-500 mt-1 max-w-xs truncate">
                            {coupon.description}
                          </div>
                        )}
                      </td>

                      {/* Discount Type */}
                      <td className="p-3.5">
                        {coupon.discount_type === "free" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>مجاني 100%</span>
                          </span>
                        ) : coupon.discount_type === "percentage" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <Percent className="w-3 h-3 text-emerald-600" />
                            <span>خصم {coupon.discount_value}%</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <Coins className="w-3 h-3 text-blue-600" />
                            <span>خصم {coupon.discount_value} ج.م</span>
                          </span>
                        )}
                      </td>

                      {/* Applicable Plan */}
                      <td className="p-3.5">
                        <span className="font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 uppercase text-[11px]">
                          {coupon.applicable_plan === "all" ? "جميع الباقات" : coupon.applicable_plan}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="p-3.5 text-neutral-600 font-mono">
                        {coupon.duration_days} يوم
                      </td>

                      {/* Usage */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="font-mono text-xs text-[#05291A] font-bold">
                            {coupon.used_count} / {coupon.max_uses ?? "∞"}
                          </div>
                          {coupon.max_uses && (
                            <div className="w-20 bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#056B38] h-full"
                                style={{
                                  width: `${Math.min(100, (coupon.used_count / coupon.max_uses) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="p-3.5 text-neutral-600 text-[11px]">
                        {coupon.expires_at ? (
                          <span className={isExpired ? "text-red-600 font-bold" : ""}>
                            {new Date(coupon.expires_at).toLocaleDateString("ar-EG")}
                          </span>
                        ) : (
                          <span className="text-neutral-400">بدون انتهاء</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isExpired ? (
                          <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            منتهي
                          </span>
                        ) : isLimitReached ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            استنفد
                          </span>
                        ) : coupon.is_active === 1 ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            نشط ومتاح
                          </span>
                        ) : (
                          <span className="text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            معطل
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pl-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coupon.id, coupon.is_active === 1)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              coupon.is_active === 1
                                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                            title={coupon.is_active === 1 ? "تعطيل الكوبون" : "تفعيل الكوبون"}
                          >
                            {coupon.is_active === 1 ? "تعطيل" : "تفعيل"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                            title="حذف الكوبون"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemptions Log Table */}
      {redemptions.length > 0 && (
        <div className="bg-white rounded-[24px] border border-[#D1E3D6] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#D1E3D6] bg-neutral-50/70">
            <h3 className="text-sm font-black text-[#05291A] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#056B38]" />
              <span>أحدث عمليات تفعيل الكوبونات (سجل الاستخدام)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F7FAF8] text-[#526B5E] font-bold border-b border-[#D1E3D6]">
                <tr>
                  <th className="p-3 pr-5">المستخدم</th>
                  <th className="p-3">الكوبون</th>
                  <th className="p-3">الباقة المفعلة</th>
                  <th className="p-3">قيمة الخصم</th>
                  <th className="p-3 pl-5">تاريخ التفعيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1E3D6]">
                {redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/80">
                    <td className="p-3 pr-5">
                      <div className="font-bold text-[#05291A]">{r.user_name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{r.user_email}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-[#056B38] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {r.coupon_code}
                      </span>
                    </td>
                    <td className="p-3 font-bold uppercase text-neutral-700">{r.plan_applied}</td>
                    <td className="p-3 font-mono text-neutral-800">{r.discount_amount} ج.م</td>
                    <td className="p-3 pl-5 text-neutral-500 text-[11px]">
                      {new Date(r.redeemed_at).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-lg bg-white rounded-[28px] border border-[#D1E3D6] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#05291A] to-[#08592E] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <Tag className="w-5 h-5 text-emerald-300" />
                <h3 className="text-base font-black text-white">إنشاء كوبون خصم / تفعيل جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Code */}
              <div className="space-y-1.5">
                <label className="font-black text-[#05291A]">رمز الكوبون (الكود) *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="مثال: SCORA100 أو VIPFREE"
                  className="w-full h-10 px-3.5 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/20 outline-hidden uppercase"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#05291A]">الوصف الداخلي (اختياري)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="مثال: كوبون مجاني للدفعة الأولى من المطورين"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-1.5">
                <label className="font-black text-[#05291A]">نوع الخصم *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("free");
                      setFormValue(100);
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      formType === "free"
                        ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                        : "border-[#D1E3D6] bg-white text-neutral-600 hover:border-[#056B38]"
                    }`}
                  >
                    ✨ مجاني 100%
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("percentage");
                      setFormValue(50);
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      formType === "percentage"
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] ring-2 ring-[#056B38]/20"
                        : "border-[#D1E3D6] bg-white text-neutral-600 hover:border-[#056B38]"
                    }`}
                  >
                    % نسبة مئوية
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("fixed");
                      setFormValue(100);
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      formType === "fixed"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20"
                        : "border-[#D1E3D6] bg-white text-neutral-600 hover:border-[#056B38]"
                    }`}
                  >
                    ج.م مبلغ ثابت
                  </button>
                </div>
              </div>

              {/* Discount Value (if not free) */}
              {formType !== "free" && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#05291A]">
                    {formType === "percentage" ? "نسبة الخصم المئوية (%)" : "قيمة الخصم بالجنيه (ج.م)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formType === "percentage" ? 100 : 10000}
                    value={formValue}
                    onChange={(e) => setFormValue(Number(e.target.value))}
                    className="w-full h-10 px-3.5 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>
              )}

              {/* Applicable Plan & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#05291A]">الباقة الصالحة لها</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as "all" | "pro" | "vip")}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-[#D1E3D6] bg-white focus:border-[#056B38] outline-hidden"
                  >
                    <option value="all">جميع الباقات (All)</option>
                    <option value="pro">باقة Pro فقط</option>
                    <option value="vip">باقة VIP فقط</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#05291A]">مدة الاشتراك (أيام)</label>
                  <input
                    type="number"
                    min={1}
                    value={formDays}
                    onChange={(e) => setFormDays(Number(e.target.value))}
                    className="w-full h-10 px-3.5 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>
              </div>

              {/* Max Uses & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#05291A]">أقصى عدد استخدامات</label>
                  <input
                    type="number"
                    min={1}
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="اتركه فارغاً لغير محدود"
                    className="w-full h-10 px-3.5 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#05291A]">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-[#D1E3D6] bg-white focus:border-[#056B38] outline-hidden"
                  />
                </div>
              </div>

              {/* Active Switch */}
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded-md border-[#D1E3D6] text-[#056B38] focus:ring-[#056B38]"
                />
                <span className="font-bold text-[#05291A]">تفعيل الكوبون فوراً بعد الحفظ</span>
              </label>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 px-4 rounded-xl border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 rounded-xl bg-[#056B38] hover:bg-[#08592E] text-white font-black shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>حفظ وإنشاء الكوبون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
