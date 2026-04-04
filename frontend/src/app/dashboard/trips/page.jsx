"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Calendar, Users, Wallet, Search, Plus,
  ArrowRight, Plane, CheckCircle2, Clock, BookOpen,
  PlayCircle, Trophy, SlidersHorizontal, Loader2, Globe
} from "lucide-react";
import Link from "next/link";
import { useTripStore } from "../../../store/tripStore";

const STATUS_CONFIG = {
  planned: {
    label: "Planned",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  active: {
    label: "Active",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  completed: {
    label: "Completed",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
  },
};

function getDurationDays(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const days = Math.round(ms / 86400000);
  return days > 0 ? days : null;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function EmptyState({ tab }) {
  const config = {
    all: { icon: Globe, title: "No trips yet", desc: "Start by planning your first adventure." },
    planned: { icon: BookOpen, title: "No planned trips", desc: "Plan a trip to see it here." },
    active: { icon: PlayCircle, title: "No active trips", desc: "Activate a planned trip to begin your journey." },
    completed: { icon: Trophy, title: "No completed trips", desc: "Complete an adventure to build your archive." },
  };
  const { icon: Icon, title, desc } = config[tab] || config.all;
  return (
    <div className="card-pure border-2 border-dashed border-pure rounded-[48px] text-center py-20 col-span-full">
      <div className="w-20 h-20 bg-secondary-pure rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-muted-pure opacity-50" />
      </div>
      <h3 className="text-2xl font-black text-main-pure mb-2 tracking-tighter">{title}</h3>
      <p className="text-muted-pure font-bold mb-8">{desc}</p>
      <Link href="/dashboard/planner"
        className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--accent-primary)] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
        <Plus className="w-4 h-4" /> Plan a Trip
      </Link>
    </div>
  );
}

function TripCard({ trip, onActivate, activating }) {
  const status = trip.status || "planned";
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const duration = getDurationDays(trip.start_date, trip.return_date || trip.end_date);

  return (
    <div className="card-pure p-6 rounded-[32px] border border-pure hover:border-[var(--accent-primary)]/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl group flex flex-col">

      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${sc.bg} ${sc.color} ${sc.border}`}>
              {sc.label}
            </span>
            {duration && (
              <span className="text-[10px] font-black text-muted-pure px-2 py-1 bg-secondary-pure rounded-xl">
                {duration} day{duration !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-main-pure tracking-tighter leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
            {trip.destination || "Unknown Destination"}
          </h3>
          {trip.source && (
            <p className="text-xs font-bold text-muted-pure mt-1 flex items-center gap-1">
              <Plane className="w-3 h-3" /> from {trip.source}
            </p>
          )}
        </div>
        <div className="w-14 h-14 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--accent-primary)] transition-colors group-hover:rotate-3 duration-300">
          <MapPin className="w-6 h-6 text-[var(--accent-primary)] group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Trip Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {(trip.start_date || trip.return_date) && (
          <div className="bg-secondary-pure rounded-2xl p-3">
            <p className="text-[9px] font-black text-muted-pure uppercase tracking-widest mb-0.5">Dates</p>
            <p className="text-xs font-black text-main-pure">
              {formatDate(trip.start_date)}
              {trip.return_date && ` → ${formatDate(trip.return_date || trip.end_date)}`}
            </p>
          </div>
        )}
        {trip.budget > 0 && (
          <div className="bg-secondary-pure rounded-2xl p-3">
            <p className="text-[9px] font-black text-muted-pure uppercase tracking-widest mb-0.5">Budget</p>
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              ₹{Number(trip.budget).toLocaleString("en-IN")}
            </p>
          </div>
        )}
        {trip.num_travelers > 0 && (
          <div className="bg-secondary-pure rounded-2xl p-3">
            <p className="text-[9px] font-black text-muted-pure uppercase tracking-widest mb-0.5">Travellers</p>
            <p className="text-xs font-black text-main-pure flex items-center gap-1">
              <Users className="w-3 h-3 text-muted-pure" /> {trip.num_travelers}
            </p>
          </div>
        )}
        {trip.group_type && (
          <div className="bg-secondary-pure rounded-2xl p-3">
            <p className="text-[9px] font-black text-muted-pure uppercase tracking-widest mb-0.5">Type</p>
            <p className="text-xs font-black text-main-pure capitalize">{trip.group_type}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex gap-2">
        {status === "planned" && onActivate && (
          <button
            onClick={() => onActivate(trip.id)}
            disabled={activating === trip.id}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--accent-primary)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all active:scale-95 disabled:opacity-60"
          >
            {activating === trip.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            Activate
          </button>
        )}
        {status === "completed" && (
          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">
            <Trophy className="w-4 h-4" /> Completed
          </div>
        )}
        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary-pure text-main-pure rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] transition-all group/btn">
          View Details <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

const TABS = ["all", "planned", "active", "completed"];

export default function MyTripsPage() {
  const { trips, fetchMyTrips, activateTrip, tripsLoaded } = useTripStore();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchMyTrips();
  }, []);

  // Stats
  const totalBudget = useMemo(() =>
    trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0), [trips]);
  const completedCount = useMemo(() =>
    trips.filter(t => t.status === "completed").length, [trips]);
  const activeCount = useMemo(() =>
    trips.filter(t => t.status === "active").length, [trips]);

  // Filter + search
  const filtered = useMemo(() => {
    return trips
      .filter(t => activeTab === "all" || t.status === activeTab)
      .filter(t => !search || (t.destination || "").toLowerCase().includes(search.toLowerCase()));
  }, [trips, activeTab, search]);

  const handleActivate = async (tripId) => {
    setActivating(tripId);
    await activateTrip(tripId);
    setActivating(null);
  };

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div className="mb-12">
        <h1 className="text-6xl font-black text-main-pure tracking-tighter lowercase leading-none">
          My Journeys<span className="text-[var(--accent-primary)]">.</span>
        </h1>
        <p className="text-muted-pure font-bold mt-3">Your adventure archive — planned, active & completed</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { label: "Total Trips", value: trips.length, icon: Globe, iconColor: "text-indigo-500", bgColor: "bg-indigo-500/10" },
          { label: "Completed", value: completedCount, icon: Trophy, iconColor: "text-emerald-500", bgColor: "bg-emerald-500/10" },
          {
            label: "Total Budget",
            value: totalBudget > 0 ? `₹${totalBudget.toLocaleString("en-IN")}` : "—",
            icon: Wallet, iconColor: "text-amber-500", bgColor: "bg-amber-500/10"
          },
        ].map(({ label, value, icon: Icon, iconColor, bgColor }) => (
          <div key={label} className="card-pure p-6 rounded-[32px] border border-pure hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${bgColor} rounded-2xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-pure uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-main-pure tracking-tighter">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-pure pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by destination..."
          className="input-pure w-full pl-14 pr-5 py-4 rounded-2xl text-sm font-bold"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-8 border-b border-pure mb-10 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-5 text-xs font-black uppercase tracking-[0.2em] relative flex-shrink-0 transition-all ${
              activeTab === tab ? "text-[var(--accent-primary)]" : "text-muted-pure hover:text-main-pure"
            }`}
          >
            {tab}
            <span className="ml-2 text-[9px] font-black opacity-60">
              ({tab === "all" ? trips.length : trips.filter(t => t.status === tab).length})
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {!tripsLoaded ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[var(--accent-primary)] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            filtered.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onActivate={handleActivate}
                activating={activating}
              />
            ))
          )}
        </div>
      )}

      {/* New Trip CTA */}
      <div className="mt-16 flex justify-center">
        <Link href="/dashboard/planner"
          className="flex items-center gap-4 px-10 py-5 bg-[var(--accent-primary)] text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-2xl hover:-translate-y-1 transition-all hover:bg-[var(--accent-hover)]">
          <Plus className="w-4 h-4" /> Plan a New Journey
        </Link>
      </div>
    </div>
  );
}
