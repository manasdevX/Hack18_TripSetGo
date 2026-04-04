"use client";
import {
  PieChart,
  TrendingUp,
  CreditCard,
  Map,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";

export default function AnalyticsPage() {
  // Mock data for the UI
  const totalSpent = 3250;
  const budgetLimit = 5000;
  const spentPercentage = (totalSpent / budgetLimit) * 100;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12 px-4 sm:px-0">
      {/* Page Header - Theme Aware */}
      <div className="mb-10 py-6">
        <h1 className="text-4xl font-black text-main-pure mb-2 tracking-tighter uppercase leading-none">
          Travel Analytics
        </h1>
        <p className="text-muted-pure font-bold uppercase tracking-widest text-sm opacity-80">
          Track your spending and optimize your future travel budgets with AI.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Total Spent Card */}
        <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm transition-all hover:-translate-y-2 duration-500 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 rounded-[20px] flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
              <CreditCard className="w-7 h-7" />
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
              <ArrowDownRight className="w-4 h-4" /> 12%
            </span>
          </div>
          <p className="text-muted-pure font-black text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">
            Total Spent This Year
          </p>
          <h2 className="text-4xl font-black text-main-pure tracking-tighter">
            ${totalSpent.toLocaleString()}
          </h2>
        </div>

        {/* Annual Budget Card */}
        <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm transition-all hover:-translate-y-2 duration-500 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-[20px] flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
              <Wallet className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black text-muted-pure uppercase tracking-widest bg-secondary-pure px-3 py-1.5 rounded-xl border border-pure shadow-sm">2026</span>
          </div>
          <p className="text-muted-pure font-black text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">
            Annual Budget Remaining
          </p>
          <h2 className="text-4xl font-black text-main-pure tracking-tighter">
            ${(budgetLimit - totalSpent).toLocaleString()}
          </h2>

          {/* Progress Bar */}
          <div className="w-full bg-secondary-pure h-2.5 rounded-full mt-6 overflow-hidden border border-pure shadow-inner">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              style={{ width: `${spentPercentage}%` }}
            />
          </div>
        </div>

        {/* Cost Per Trip Card */}
        <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm transition-all hover:-translate-y-2 duration-500 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-sky-500/10 text-sky-600 rounded-[20px] flex items-center justify-center shadow-inner group-hover:bg-sky-600 group-hover:text-white transition-all duration-500">
              <Map className="w-7 h-7" />
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
              <ArrowUpRight className="w-4 h-4" /> 5%
            </span>
          </div>
          <p className="text-muted-pure font-black text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">
            Average Cost Per Trip
          </p>
          <h2 className="text-4xl font-black text-main-pure tracking-tighter">$812</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Spending by Category - REMOVED ITALIC */}
        <div className="card-pure p-10 rounded-[48px] border border-pure shadow-sm">
          <h3 className="text-2xl font-black text-main-pure mb-10 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <PieChart className="w-7 h-7 text-indigo-500" /> Spending Matrix
          </h3>

          <div className="space-y-8">
            <CategoryRow label="Flights & Transport" amount="$1,450" percentage={45} color="bg-indigo-500" />
            <CategoryRow label="Accommodation" amount="$1,100" percentage={35} color="bg-sky-500" />
            <CategoryRow label="Food & Dining" amount="$450" percentage={15} color="bg-emerald-500" />
            <CategoryRow label="Activities & Tickets" amount="$250" percentage={8} color="bg-amber-500" />
          </div>
        </div>

        {/* AI Budget Recommendations - REMOVED ITALIC */}
        <div className="bg-slate-900 p-10 rounded-[48px] shadow-2xl relative overflow-hidden group transition-all duration-500 border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-[60px]" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-6 mb-10">
               <div className="w-16 h-16 bg-indigo-600 rounded-[20px] flex items-center justify-center shadow-2xl shadow-indigo-900/40 rotate-3">
                  <TrendingUp className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-3">
                    Neural Insights
                  </h3>
                  <p className="text-indigo-200/50 text-[10px] font-black uppercase tracking-widest mt-1">Autonomous spending analysis active</p>
               </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-colors shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-indigo-300 font-black text-xs uppercase tracking-[0.2em]">
                    Flight Optimization
                  </h4>
                </div>
                <p className="text-slate-300 text-sm font-bold leading-relaxed opacity-90 uppercase tracking-tight">
                  YOUR BUDGET AGENT NOTICED YOU SPEND 45% OF YOUR BUDGET ON
                  FLIGHTS. FLYING OUT ON TUESDAYS INSTEAD OF FRIDAYS COULD SAVE
                  YOU ROUGHLY $300 ANNUALLY.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-colors shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-emerald-300 font-black text-xs uppercase tracking-[0.2em]">
                    Dining Habits
                  </h4>
                </div>
                <p className="text-slate-300 text-sm font-bold leading-relaxed opacity-90 uppercase tracking-tight">
                  YOU ARE CURRENTLY 12% UNDER BUDGET ON FOOD FOR THE YEAR. GREAT
                  JOB UTILIZING THE LOCAL RESTAURANT RECOMMENDATIONS!
                </p>
              </div>
            </div>
            
            <button className="w-full mt-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
               APPLY OPTIMIZATION NODES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ label, amount, percentage, color }) {
  return (
    <div className="group/row">
      <div className="flex justify-between items-end mb-3">
        <div>
          <span className="text-[10px] font-black text-muted-pure uppercase tracking-[0.2em] mb-1 block opacity-70">{label}</span>
          <span className="text-xl font-black text-main-pure tracking-tighter leading-none">{amount}</span>
        </div>
        <span className="text-sm font-black text-main-pure opacity-30 group-hover/row:opacity-100 transition-opacity">{percentage}%</span>
      </div>
      <div className="w-full bg-secondary-pure h-3 rounded-full overflow-hidden border border-pure shadow-inner">
        <div
          className={`${color} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.2)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
