"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { useSubscriptionStore } from "../../../store/subscriptionStore";
import {
  Check,
  Zap,
  Crown,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  TrendingUp,
  Shield,
  X,
} from "lucide-react";

// ─── Plan config (mirrors backend PLANS) ─────────────────────────────────
const PLANS = {
  FREE: {
    name: "Free",
    description: "Get started with basic trip planning",
    icon: Star,
    gradient: "from-slate-600 to-slate-700",
    accentColor: "text-slate-400",
    borderColor: "border-slate-700/50",
    bgGlow: "from-slate-500/5",
    badge: null,
    daily_limit: 5,
    monthly_price: 0,
    yearly_price: 0,
    features: [
      "5 trip plans per day",
      "Basic AI itinerary generation",
      "Standard route planning",
      "Community support",
    ],
    missing: ["Priority AI processing", "Full trip history", "Premium support"],
  },
  PRO_MONTHLY: {
    name: "Pro Monthly",
    description: "Perfect for frequent travelers",
    icon: Zap,
    gradient: "from-indigo-500 to-violet-600",
    accentColor: "text-indigo-400",
    borderColor: "border-indigo-500/50",
    bgGlow: "from-indigo-500/10",
    badge: "Most Popular",
    badgeColor: "bg-indigo-500",
    daily_limit: 50,
    monthly_price: 199,
    yearly_price: null,
    features: [
      "50 trip plans per day",
      "Advanced AI itinerary",
      "Priority AI processing",
      "Full trip history",
      "Weather + Budget agents",
      "Email support",
    ],
    missing: [],
  },
  PRO_YEARLY: {
    name: "Pro Yearly",
    description: "Maximum value for travel enthusiasts",
    icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/50",
    bgGlow: "from-amber-500/10",
    badge: "Best Value",
    badgeColor: "bg-amber-500",
    daily_limit: 50,
    monthly_price: null,
    yearly_price: 1999,
    features: [
      "50 trip plans per day",
      "Advanced AI itinerary",
      "Priority AI processing",
      "Full trip history",
      "Weather + Budget agents",
      "Priority support",
      "Save ₹389 vs monthly",
    ],
    missing: [],
  },
};

// ─── Usage Bar Component ──────────────────────────────────────────────────
function UsageBar({ used, limit, plan }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = pct >= 70;
  const isDanger = pct >= 100;

  const barColor = isDanger
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-gradient-to-r from-indigo-500 to-violet-500";

  const textColor = isDanger
    ? "text-red-400"
    : isWarning
    ? "text-amber-400"
    : "text-indigo-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${textColor}`} />
          <span className="text-sm font-semibold text-white">Today's Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isDanger
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : isWarning
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {plan.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className="font-bold text-white">{used}</span>
          <span className="text-slate-500"> / </span>
          <span className="font-bold text-white">{limit}</span>
          <span className="text-slate-500"> searches used today</span>
        </p>
        {isDanger && (
          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Limit reached
          </span>
        )}
        {!isDanger && (
          <span className="text-xs text-slate-500">{Math.round(pct)}% used</span>
        )}
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────
function PlanCard({ planKey, plan, isCurrentPlan, billingCycle, onSubscribe, isLoading }) {
  const Icon = plan.icon;
  const isPro = planKey !== "FREE";

  // Show/hide based on billing cycle
  const shouldShow =
    planKey === "FREE" ||
    (billingCycle === "monthly" && planKey === "PRO_MONTHLY") ||
    (billingCycle === "yearly" && planKey === "PRO_YEARLY");

  if (!shouldShow) return null;

  const price =
    planKey === "PRO_YEARLY"
      ? plan.yearly_price
      : planKey === "PRO_MONTHLY"
      ? plan.monthly_price
      : 0;

  const isFeatured = plan.badge != null;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 group ${plan.borderColor} ${
        isFeatured
          ? "bg-gradient-to-b from-white/[0.08] to-white/[0.03] shadow-2xl scale-[1.02]"
          : "bg-white/[0.02] hover:bg-white/[0.05]"
      } ${isCurrentPlan ? "ring-2 ring-indigo-500/60" : ""}`}
    >
      {/* Glow */}
      {isFeatured && (
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${plan.bgGlow} to-transparent pointer-events-none`}
        />
      )}

      {/* Badge */}
      {plan.badge && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 ${plan.badgeColor} rounded-full text-white text-xs font-bold shadow-lg`}
        >
          {plan.badge}
        </div>
      )}

      {/* Icon + Name */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
      <p className="text-xs text-slate-400 mb-4">{plan.description}</p>

      {/* Price */}
      <div className="mb-4">
        {price === 0 ? (
          <div className="text-3xl font-black text-white">
            Free
            <span className="text-sm text-slate-400 font-normal ml-1">forever</span>
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-sm text-slate-400 mb-1">₹</span>
            <span className="text-3xl font-black text-white">{price}</span>
            <span className="text-sm text-slate-400 mb-1">
              /{planKey === "PRO_YEARLY" ? "yr" : "mo"}
            </span>
          </div>
        )}
      </div>

      {/* Daily limit */}
      <div className={`flex items-center gap-2 text-xs font-semibold ${plan.accentColor} mb-5 bg-white/5 rounded-lg px-3 py-2`}>
        <Shield className="w-3.5 h-3.5" />
        {plan.daily_limit} trip searches per day
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {plan.missing.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 line-through">
            <X className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrentPlan ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" />
          Current Plan
        </div>
      ) : planKey === "FREE" ? (
        <div className="flex items-center justify-center py-3 rounded-xl border border-white/10 text-slate-500 text-sm font-semibold">
          Always Free
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(planKey)}
          disabled={isLoading}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
            isFeatured
              ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.02]`
              : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Upgrade to ${plan.name.split(" ")[0]}`
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const {
    subscription,
    isLoading,
    error,
    fetchStatus,
    initiatePayment,
    clearError,
  } = useSubscriptionStore();

  const [billingCycle, setBillingCycle] = useState("monthly");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubscribe = (plan) => {
    clearError();
    setPaymentLoading(true);
    initiatePayment(
      plan,
      () => {
        setPaymentLoading(false);
        showToast("🎉 Subscription activated! Enjoy your Pro plan.", "success");
      },
      (msg) => {
        setPaymentLoading(false);
        showToast(msg || "Payment failed. Please try again.", "error");
      }
    );
  };

  const currentPlan = subscription?.subscription_type || "FREE";
  const dailyUsed = subscription?.daily_usage ?? 0;
  const dailyLimit = subscription?.daily_limit ?? 5;
  const expiry = subscription?.subscription_expiry;
  const subStatus = subscription?.subscription_status;

  return (
    <>
      {/* Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="max-w-4xl mx-auto px-4 pb-20 animate-fade-in">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-medium animate-fade-in ${
              toast.type === "error"
                ? "bg-red-950 border border-red-500/40 text-red-300"
                : "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.msg}
            <button
              onClick={() => setToast(null)}
              className="ml-2 opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-10 pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Subscription Plans
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">
            Unlock Your Full Travel{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Potential
            </span>
          </h1>
          <p className="text-slate-400 text-base">
            Choose a plan that matches your travel ambitions. Upgrade anytime, cancel anytime.
          </p>
        </div>

        {/* Usage Indicator */}
        {isLoading && !subscription ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-3 text-slate-400">Loading subscription…</span>
          </div>
        ) : (
          <UsageBar used={dailyUsed} limit={dailyLimit} plan={currentPlan} />
        )}

        {/* Active plan expiry notice */}
        {currentPlan !== "FREE" && expiry && subStatus === "active" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300 mb-6">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            Your{" "}
            <strong className="text-indigo-300">
              {currentPlan.replace("_", " ")}
            </strong>{" "}
            plan is active until{" "}
            <strong className="text-white">
              {new Date(expiry).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mb-8">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === "yearly"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Yearly
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              Save ₹389
            </span>
          </button>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Object.entries(PLANS).map(([key, plan]) => (
            <PlanCard
              key={key}
              planKey={key}
              plan={plan}
              isCurrentPlan={currentPlan === key}
              billingCycle={billingCycle}
              onSubscribe={handleSubscribe}
              isLoading={paymentLoading}
            />
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-950 border border-red-500/30 text-red-300 text-sm mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {typeof error === "string" ? error : error?.error || JSON.stringify(error)}
            </span>
          </div>
        )}

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
          <Shield className="w-3.5 h-3.5" />
          <span>Payments secured by Razorpay · PCI DSS compliant · Cancel anytime</span>
        </div>
      </div>
    </>
  );
}
