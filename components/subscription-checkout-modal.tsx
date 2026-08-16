"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Tag,
  ShieldCheck,
  Zap,
  CreditCard,
  Loader2,
  AlertCircle,
  Gift,
} from "lucide-react";
import { DEFAULT_PLAN_LIMITS, type PlanLimits, type SubscriptionPlan } from "@/lib/ai-quota-types";
import { useProfile } from "@/components/profile-provider";
import { EgpCurrencyIcon } from "@/components/egp-currency-icon";

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: "pro" | "vip";
  onSuccess?: () => void;
}

export function SubscriptionCheckoutModal({
  isOpen,
  onClose,
  initialPlan = "pro",
  onSuccess,
}: SubscriptionCheckoutModalProps) {
  const { userRole, addToast } = useProfile();
  const [plans, setPlans] = useState<Record<SubscriptionPlan, PlanLimits>>(DEFAULT_PLAN_LIMITS);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "vip">(initialPlan);
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description?: string | null;
    discountType: string;
    discountValue: number;
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    isFree: boolean;
  } | null>(null);

  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.plans) setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to load plans in checkout modal:", err);
      }
    }
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const role = userRole === "client" ? "client" : "developer";
  const planInfo = plans[selectedPlan] || DEFAULT_PLAN_LIMITS[selectedPlan];
  const basePrice = planInfo.priceEgp[role];
  const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : basePrice;

  // Validate coupon
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          plan: selectedPlan,
          userRole: role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || "كوبون الخصم غير صالح أو منتهي");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data.coupon);
        addToast(data.message || "تم تطبيق الخصم بنجاح!", "success");
      }
    } catch {
      setCouponError("تعذر التحقق من الكوبون حالياً. حاول مرة أخرى.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Submit subscription
  const handleConfirmSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "تعذر تفعيل الاشتراك");
      }

      addToast(data.message || "تم تفعيل باقتك بنجاح!", "success");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : "تعذر إتمام العملية", "warn");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="relative w-full max-w-2xl bg-white rounded-[28px] border border-[#D1E3D6] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 bg-gradient-to-r from-[#05291A] to-[#08592E] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">ترقية وتفعيل باقة Scora</h3>
              <p className="text-xs text-emerald-100/80">
                افتح كامل سعة الـ SSD AI Agent ومميزات المنصة الاحترافية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Plan Switcher Pills */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[#05291A]">اختر الباقة المناسبة لك:</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Pro Plan Choice */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("pro");
                  if (appliedCoupon) handleRemoveCoupon();
                }}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between relative ${
                  selectedPlan === "pro"
                    ? "border-[#056B38] bg-[#E8FAF0] ring-2 ring-[#056B38]/30 shadow-xs"
                    : "border-[#D1E3D6] bg-white hover:border-[#056B38]/50"
                }`}
              >
                {selectedPlan === "pro" && (
                  <span className="absolute top-3 left-3 h-5 w-5 rounded-full bg-[#056B38] text-white flex items-center justify-center text-xs">
                    ✓
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#05291A]">باقة Pro</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#056B38] text-white">
                      الأكثر طلباً
                    </span>
                  </div>
                  <div className="text-xs text-[#526B5E] mt-1 flex items-center gap-1">
                    <span>{plans.pro.priceEgp[role]}</span>
                    <EgpCurrencyIcon className="w-3.5 h-3.5 text-[#056B38]" />
                    <span>/ شهر</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 text-[11px] font-bold text-[#056B38]">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{plans.pro.dailyRequests} طلب يومياً · {plans.pro.weeklyRequests} أسبوعياً</span>
                </div>
              </button>

              {/* VIP Plan Choice */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("vip");
                  if (appliedCoupon) handleRemoveCoupon();
                }}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between relative ${
                  selectedPlan === "vip"
                    ? "border-[#056B38] bg-[#05291A] text-white ring-2 ring-[#056B38]/50 shadow-md"
                    : "border-[#D1E3D6] bg-white hover:border-[#056B38]/50"
                }`}
              >
                {selectedPlan === "vip" && (
                  <span className="absolute top-3 left-3 h-5 w-5 rounded-full bg-emerald-400 text-[#05291A] flex items-center justify-center text-xs font-black">
                    ✓
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${selectedPlan === "vip" ? "text-white" : "text-[#05291A]"}`}>
                      باقة VIP الفائقة
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      selectedPlan === "vip" ? "bg-white/20 text-white" : "bg-[#05291A] text-white"
                    }`}>
                      VIP
                    </span>
                  </div>
                  <div className={`text-xs mt-1 flex items-center gap-1 ${selectedPlan === "vip" ? "text-emerald-100" : "text-[#526B5E]"}`}>
                    <span>{plans.vip.priceEgp[role]}</span>
                    <EgpCurrencyIcon className={`w-3.5 h-3.5 ${selectedPlan === "vip" ? "text-white" : "text-[#056B38]"}`} />
                    <span>/ شهر</span>
                  </div>
                </div>
                <div
                  className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-[11px] font-bold ${
                    selectedPlan === "vip" ? "border-emerald-700/60 text-emerald-300" : "border-emerald-200/60 text-[#056B38]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{plans.vip.dailyRequests} طلب يومياً · {plans.vip.weeklyRequests} أسبوعياً</span>
                </div>
              </button>
            </div>
          </div>

          {/* AI Limits Overview Card */}
          <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#05291A]">
              <span>تفاصيل سعة SSD AI ومميزات المنصة:</span>
              <span className="text-[#056B38] font-mono">{planInfo.name} Plan</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80 space-y-0.5">
                <div className="text-neutral-500">طلبات AI اليومية</div>
                <div className="font-extrabold text-[#05291A] text-xs font-mono">
                  {planInfo.dailyRequests} طلب / يوم
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80 space-y-0.5">
                <div className="text-neutral-500">طلبات AI الأسبوعية</div>
                <div className="font-extrabold text-[#05291A] text-xs font-mono">
                  {planInfo.weeklyRequests} طلب / أسبوع
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80 space-y-0.5">
                <div className="text-neutral-500">عروض المشاريع</div>
                <div className="font-extrabold text-[#056B38] text-xs">
                  {planInfo.proposalsMonthlyLimit >= 999 ? "غير محدود" : `${planInfo.proposalsMonthlyLimit} عرض/شهر`}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80 space-y-0.5">
                <div className="text-neutral-500">خصم العمولة</div>
                <div className="font-extrabold text-[#056B38] text-xs">
                  {planInfo.commissionDiscountPercent}% خصم
                </div>
              </div>
            </div>
          </div>

          {/* Promo / Discount Coupon Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#056B38]" />
                <span>لديك كوبون خصم أو رمز ترويجي؟</span>
              </label>
              <span className="text-[11px] text-neutral-400">جرب SCORA100 أو VIPFREE</span>
            </div>

            {!appliedCoupon ? (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="أدخل رمز الكوبون هنا (مثلاً: SCORA100)"
                  className="flex-1 h-11 px-4 text-xs font-mono rounded-xl border border-[#D1E3D6] focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/20 outline-hidden uppercase"
                />
                <button
                  type="submit"
                  disabled={!couponCode.trim() || isValidatingCoupon}
                  className="h-11 px-5 rounded-xl bg-[#056B38] hover:bg-[#08592E] disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                  <span>تطبيق</span>
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-[#05291A]">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-[#056B38] text-white flex items-center justify-center text-xs">
                    ✓
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-black text-[#056B38]">{appliedCoupon.code}</span>
                    <span className="text-neutral-500 text-[11px] mr-2">
                      {appliedCoupon.isFree ? (
                        "خصم 100% (تفعيل مجاني كامل)"
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span>خصم {appliedCoupon.discountAmount}</span>
                          <EgpCurrencyIcon className="w-3 h-3 text-[#056B38]" />
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-red-600 hover:text-red-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء الكوبون
                </button>
              </div>
            )}

            {couponError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}
          </div>

          {/* Payment Gateways (Disabled / Greyed Out Mode) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                <span>طرق الدفع الإلكتروني:</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">
                قريباً · مغلقة مؤقتاً
              </span>
            </div>

            {/* Inactive Gateways Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 opacity-60 pointer-events-none select-none">
              {/* Paymob */}
              <div className="p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center text-center gap-1">
                <span className="text-xs font-black text-neutral-700">Paymob</span>
                <span className="text-[11px] text-neutral-500 font-medium">باي موب</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 rounded-full">قريباً</span>
              </div>

              {/* Fawry */}
              <div className="p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center text-center gap-1">
                <span className="text-xs font-black text-amber-800">Fawry</span>
                <span className="text-[11px] text-neutral-500 font-medium">فوري باي</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 rounded-full">قريباً</span>
              </div>

              {/* Bank Cards */}
              <div className="p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center text-center gap-1">
                <span className="text-xs font-black text-blue-900">Visa / Meeza</span>
                <span className="text-[11px] text-neutral-500 font-medium">كروت بنكية</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 rounded-full">قريباً</span>
              </div>

              {/* PayPal */}
              <div className="p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center text-center gap-1">
                <span className="text-xs font-black text-indigo-900">PayPal</span>
                <span className="text-[11px] text-neutral-500 font-medium">باي بال</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 rounded-full">قريباً</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed">
              💡 <strong>تنويه:</strong> بوابات الدفع الإلكتروني قيد الربط والتفعيل الرسمي حالياً. يمكنك تفعيل الاشتراك فوراً ومجاناً في الفترة الحالية باستخدام الكوبونات الترويجية مثل (<code>SCORA100</code> أو <code>VIPFREE</code>).
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-sm">
            <span className="font-bold text-neutral-600">المجموع المطلوب للدفع:</span>
            <div className="flex items-center gap-2">
              {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                <span className="text-xs text-neutral-400 line-through font-mono flex items-center gap-0.5">
                  <span>{basePrice}</span>
                  <EgpCurrencyIcon className="w-3 h-3 text-neutral-400" />
                </span>
              )}
              <span className="text-2xl font-black text-[#056B38] font-mono flex items-center gap-1.5">
                {finalPrice === 0 ? (
                  <span>مجاناً (0)</span>
                ) : (
                  <span>{finalPrice}</span>
                )}
                <EgpCurrencyIcon className="w-5 h-5 text-[#056B38]" />
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirmSubscribe}
            disabled={isSubscribing}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#056B38] to-[#08592E] hover:opacity-95 text-white text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تفعيل الباقة...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>تأكيد وتفعيل الاشتراك الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
