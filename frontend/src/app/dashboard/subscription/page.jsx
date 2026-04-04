"use client";
import { useState } from "react";
import Script from "next/script";
import {
  CreditCard,
  Zap,
  Check,
  ShieldCheck,
  PieChart,
  ArrowUpRight,
  Clock,
  Loader2,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("pro");

  const features = [
    "Unlimited AI Trip Generations",
    "Multi-Agent Weather & Budget logic",
    "Real-time Rerouting Alerts",
    "Collaborative Group Expenses",
    "Priority Customer Support",
  ];

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/v1/payments/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: "pro",
            amount: 159900, // ₹1599 in paise
          }),
        }
      );

      const order = await response.json();

      const options = {
        key: "YOUR_RAZORPAY_KEY_ID",
        amount: order.amount,
        currency: "INR",
        name: "TripSetGo",
        description: "Pro Explorer Annual Subscription",
        image: "/logo.png",
        order_id: order.id,
        handler: async function (response) {
          const verifyRes = await fetch(
            "http://localhost:8000/api/v1/payments/verify",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            }
          );

          if (verifyRes.ok) {
            alert("Welcome to the Pro Club, Manas!");
            window.location.reload();
          }
        },
        prefill: {
          name: "Manas Agnihotri",
          email: "agnihotrimanas99@gmail.com",
        },
        theme: { color: "#4f46e5" },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay SDK not loaded. Check connection.");
      }
    } catch (error) {
      console.error("Payment failed", error);
      alert("Could not initialize payment. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20 px-4 sm:px-0">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header - Theme Aware */}
      <div className="mb-12 py-6">
        <h1 className="text-4xl font-black text-main-pure mb-2 tracking-tighter uppercase leading-none">
          Status Level
        </h1>
        <p className="text-muted-pure font-bold uppercase tracking-widest text-sm opacity-80">
          Manage your subscription and view your AI usage credits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left: Usage & Current Plan Summary - REMOVED ITALICS */}
        <div className="lg:col-span-8 space-y-10 flex flex-col">
          <div className="card-pure p-10 rounded-[56px] border border-pure shadow-sm flex-1 flex flex-col justify-between transition-all hover:shadow-xl duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
              <div className="space-y-4">
                <span className="px-5 py-2 bg-indigo-500/10 text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shadow-sm border border-indigo-500/5">
                  Current Deployment
                </span>
                <h3 className="text-5xl font-black text-main-pure tracking-tighter leading-none">
                  Pro Explorer
                </h3>
                <p className="text-xs font-bold text-muted-pure uppercase tracking-widest mt-2 flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-500" /> ACTIVE LICENSE
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-5xl font-black text-main-pure tracking-tighter leading-none mb-2">
                  ₹1,599
                  <span className="text-lg text-muted-pure font-bold opacity-40 ml-2">/ yr</span>
                </p>
                <div className="inline-flex items-center gap-2 bg-secondary-pure px-4 py-1.5 rounded-full border border-pure shadow-inner">
                   <Clock className="w-3 h-3 text-indigo-500" />
                   <p className="text-[10px] font-black text-muted-pure uppercase tracking-widest">Renews: May 01, 2026</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10 border-t border-pure">
              <UsageWidget icon={PieChart} label="AI Generations" value="Unlimited" color="indigo" />
              <UsageWidget icon={Clock} label="Active Missions" value="12 / 20" color="sky" />
            </div>
          </div>

          <div className="card-pure p-10 rounded-[56px] border border-pure shadow-sm transition-all hover:shadow-xl duration-500 group">
            <h3 className="text-lg font-black text-main-pure mb-8 flex items-center gap-4 tracking-tighter uppercase leading-none">
              <CreditCard className="w-6 h-6 text-indigo-500" /> Saved Payment Method
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-secondary-pure/50 border border-pure rounded-[32px] group-hover:bg-pure group-hover:shadow-lg transition-all">
              <div className="flex items-center gap-6 mb-6 md:mb-0">
                <div className="w-16 h-10 bg-slate-900 rounded-[12px] flex items-center justify-center text-[10px] text-white font-black shadow-2xl relative overflow-hidden group-hover:scale-110 transition-transform">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-xl" />
                  VISA
                </div>
                <div>
                  <p className="text-xl font-black text-main-pure tracking-tighter">
                    •••• •••• •••• 4242
                  </p>
                  <p className="text-[10px] font-black text-muted-pure uppercase tracking-widest opacity-60 mt-1">Expires 12/28</p>
                </div>
              </div>
              <button className="px-8 py-3 rounded-xl border border-pure font-black text-[10px] text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest active:scale-95">
                Update Method
              </button>
            </div>
          </div>
        </div>

        {/* Right: Plan Comparison / Upsell - REMOVED ITALICS */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-slate-900 rounded-[64px] p-12 text-white shadow-2xl relative overflow-hidden h-full flex flex-col border border-slate-800 transition-all hover:shadow-indigo-500/10 group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
            
            <div className="relative z-10 mb-12">
               <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-950 mb-8 rotate-3 transition-transform group-hover:rotate-6">
                  <Zap className="w-8 h-8 text-white fill-current" />
               </div>
               <h3 className="text-3xl font-black mb-4 tracking-tighter uppercase leading-none">
                 Elite Directives
               </h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Unlock the full capacity of our multi-agent neural network.</p>
            </div>

            <ul className="space-y-6 mb-12 flex-1 relative z-10">
              {features.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-4 text-xs font-black text-slate-300 uppercase tracking-widest hover:text-white transition-colors group/item"
                >
                  <div className="bg-indigo-500/20 text-indigo-400 rounded-lg p-1.5 border border-indigo-500/20 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                    <Check className="w-3.5 h-3.5 stroke-[4px]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-6 bg-white text-indigo-700 font-black rounded-3xl transition-all shadow-2xl hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-4 relative z-10 disabled:opacity-70 group/btn overflow-hidden"
            >
               <div className="absolute inset-0 bg-indigo-50 translate-y-full group-hover/btn:translate-y-0 transition-transform" />
               <span className="relative z-10 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                 {loading ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                 ) : (
                   <>
                     INITIATE UPGRADE <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                   </>
                 )}
               </span>
            </button>

            <div className="text-center mt-8 relative z-10">
               <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                 SECURED BY RAZORPAY ENCRYPTION
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageWidget({ icon: Icon, label, value, color }) {
  const colorMap = {
    indigo: "text-indigo-500",
    sky: "text-sky-500",
  };

  return (
    <div className="flex items-center gap-5 p-6 bg-secondary-pure/50 rounded-[32px] border border-pure hover:bg-pure transition-all group/widget">
      <div className={`p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-pure group-hover/widget:scale-110 transition-transform ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] text-muted-pure font-black uppercase tracking-widest mb-1 opacity-60">
          {label}
        </p>
        <p className="text-xl font-black text-main-pure tracking-tighter">
          {value}
        </p>
      </div>
    </div>
  );
}
