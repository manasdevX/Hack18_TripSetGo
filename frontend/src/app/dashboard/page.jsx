"use client";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { Compass, Calendar, MapPin, ArrowRight } from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto w-full animate-fade-in group">
      {/* Restored Premium Indigo Welcome Banner */}
      <div className="relative overflow-hidden rounded-[40px] bg-indigo-600 dark:bg-slate-900 p-10 md:p-14 mb-10 text-white shadow-2xl transition-all duration-500 overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase leading-none">
            Welcome back, {user?.full_name?.split(" ")[0] || "Traveler"}! 👋
          </h1>
          <p className="text-indigo-100/80 text-lg md:text-xl font-bold mb-10 leading-relaxed uppercase tracking-widest">
            Your personalized AI travel agents are calibrated and standing by. Where shall we explore next?
          </p>
          <Link
            href="/dashboard/planner"
            className="inline-flex items-center gap-4 bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-900/20 uppercase text-xs tracking-[0.2em]"
          >
            <Compass className="w-5 h-5" />
            Plan a New Journey
          </Link>
        </div>
      </div>

      {/* Quick Stats & Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Next Trip Widget */}
        <div className="card-pure p-10 md:col-span-2 flex flex-col justify-center items-center text-center rounded-[40px] border border-pure border-dashed h-[350px] shadow-sm">
          <div className="w-24 h-24 bg-secondary-pure text-indigo-500 rounded-3xl flex items-center justify-center mb-8 border border-pure shadow-inner group-hover:scale-110 transition-transform">
            <Calendar className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-black text-main-pure mb-3 tracking-tighter uppercase">
            NO UPCOMING MISSIONS
          </h3>
          <p className="text-muted-pure mb-10 text-lg font-bold uppercase tracking-wide opacity-70">
            The world is waiting. Why not start planning your next escape?
          </p>
          <Link
            href="/dashboard/planner"
            className="text-indigo-600 font-extrabold hover:underline underline-offset-8 flex items-center gap-3 text-lg transition-all"
          >
            Create itinerary <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

        {/* Travel Stats Widget */}
        <div className="card-pure p-10 rounded-[40px] flex flex-col border border-pure shadow-sm">
          <h3 className="font-black text-2xl text-main-pure mb-10 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
              <MapPin className="w-8 h-8 text-emerald-500" />
            </div>
            Travel Passport
          </h3>
          <div className="space-y-8 flex-1">
            <StatRow label="Journeys Planned" value="00" />
            <StatRow label="Destinations Hit" value="00" />
            <StatRow label="AI Systems Active" value="04" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center group/stat">
      <span className="text-muted-pure font-bold text-sm uppercase tracking-widest leading-none">{label}</span>
      <span className="text-4xl font-black tracking-tighter text-main-pure group-hover/stat:text-indigo-600 transition-colors leading-none">{value}</span>
    </div>
  );
}
