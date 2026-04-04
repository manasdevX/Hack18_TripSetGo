"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { useTripStore } from "../../store/tripStore";
import {
  Compass, Calendar, MapPin, ArrowRight, Plane,
  PlayCircle, Users, Wallet, Globe, Cpu
} from "lucide-react";

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center group/stat py-1">
      <span className="text-muted-pure font-bold text-sm uppercase tracking-widest leading-none">{label}</span>
      <span className="text-4xl font-black tracking-tighter text-main-pure group-hover/stat:text-[var(--accent-primary)] transition-colors leading-none">{value}</span>
    </div>
  );
}

function NextTripCard({ trip }) {
  const statusColors = {
    planned: "bg-indigo-500/20 text-indigo-400",
    active: "bg-emerald-500/20 text-emerald-400",
  };
  const sc = statusColors[trip.status] || statusColors.planned;
  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest mb-5 ${sc}`}>
          <PlayCircle className="w-3 h-3" /> {trip.status === "active" ? "Active Journey" : "Next Trip"}
        </span>
        <h3 className="text-3xl font-black text-main-pure tracking-tighter mb-3 leading-tight">
          {trip.destination}
        </h3>
        {trip.source && (
          <p className="text-sm text-muted-pure font-bold flex items-center gap-2 mb-4">
            <Plane className="w-4 h-4" /> from {trip.source}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mb-6">
          {trip.start_date && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary-pure rounded-xl text-xs font-bold text-muted-pure">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(trip.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
          {trip.budget > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary-pure rounded-xl text-xs font-bold text-muted-pure">
              <Wallet className="w-3.5 h-3.5" />
              ₹{Number(trip.budget).toLocaleString("en-IN")}
            </div>
          )}
          {trip.num_travelers > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary-pure rounded-xl text-xs font-bold text-muted-pure">
              <Users className="w-3.5 h-3.5" /> {trip.num_travelers} people
            </div>
          )}
        </div>
      </div>
      <Link
        href="/dashboard/planner"
        className="text-[var(--accent-primary)] font-extrabold hover:underline underline-offset-8 flex items-center gap-3 text-base transition-all"
      >
        View Itinerary <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuthStore();
  const { trips, fetchMyTrips, tripsLoaded } = useTripStore();

  useEffect(() => {
    fetchMyTrips();
  }, []);

  const uniqueDestinations = useMemo(() =>
    [...new Set(trips.map((t) => t.destination).filter(Boolean))].length, [trips]);

  const activeTripCount = useMemo(() =>
    trips.filter((t) => t.status === "active").length, [trips]);

  const nextTrip = useMemo(() =>
    trips.find((t) => t.status === "active") ||
    trips.find((t) => t.status === "planned"), [trips]);

  return (
    <div className="max-w-7xl mx-auto w-full animate-fade-in group pb-16">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[40px] bg-indigo-600 dark:bg-slate-900 p-10 md:p-14 mb-10 text-white shadow-2xl transition-all duration-500 border border-white/10">
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
        <div className="card-pure p-10 md:col-span-2 flex flex-col rounded-[40px] border border-pure h-auto min-h-[320px] shadow-sm">
          {nextTrip ? (
            <NextTripCard trip={nextTrip} />
          ) : (
            <div className="flex flex-col justify-center items-center text-center h-full flex-1 py-6">
              <div className="w-24 h-24 bg-secondary-pure text-[var(--accent-primary)] rounded-3xl flex items-center justify-center mb-8 border border-pure shadow-inner">
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
                className="text-[var(--accent-primary)] font-extrabold hover:underline underline-offset-8 flex items-center gap-3 text-lg transition-all"
              >
                Create itinerary <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          )}
        </div>

        {/* Travel Passport Widget */}
        <div className="card-pure p-10 rounded-[40px] flex flex-col border border-pure shadow-sm">
          <h3 className="font-black text-2xl text-main-pure mb-10 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
              <MapPin className="w-8 h-8 text-emerald-500" />
            </div>
            Travel Passport
          </h3>
          <div className="space-y-8 flex-1">
            <StatRow
              label="Journeys Planned"
              value={tripsLoaded ? String(trips.length).padStart(2, "0") : "—"}
            />
            <StatRow
              label="Destinations Hit"
              value={tripsLoaded ? String(uniqueDestinations).padStart(2, "0") : "—"}
            />
            <StatRow
              label="Active Missions"
              value={tripsLoaded ? String(activeTripCount).padStart(2, "0") : "—"}
            />
            <StatRow label="AI Systems Active" value="07" />
          </div>
        </div>
      </div>
    </div>
  );
}
