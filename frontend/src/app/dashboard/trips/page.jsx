"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Calendar, Users, Wallet, Search, Plus, Trash2, Copy,
  Heart, ArrowRight, Plane, Trophy, Globe, Loader2, MoreVertical,
  SlidersHorizontal, Filter, Star, Clock, Eye, BookOpen
} from "lucide-react";
import { useTripStore } from "../../../store/tripStore";

/* ── helpers ─────────────────────────────────────────────────── */
const fmtRs = (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—";
const getDays = (s, e) => { if (!s || !e) return null; const d = Math.round((new Date(e) - new Date(s)) / 86400000); return d > 0 ? d : null; };

const VIBES = { beach: "🏖️", mountain: "🏔️", city: "🏙️", heritage: "🏯", island: "🌴", desert: "🏜️", nature: "🌿", default: "✈️" };
const getVibe = (dest) => {
  const d = (dest || "").toLowerCase();
  if (/goa|andaman|maldives|bali/.test(d)) return VIBES.beach;
  if (/manali|ladakh|himachal|shimla/.test(d)) return VIBES.mountain;
  if (/dubai|singapore|mumbai|delhi|bangalore/.test(d)) return VIBES.city;
  if (/jaipur|rajasthan|agra|hampi/.test(d)) return VIBES.heritage;
  if (/kerala|coorg|ooty/.test(d)) return VIBES.nature;
  return VIBES.default;
};

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 text-5xl"
        style={{ background: "var(--accent-soft)" }}>
        ✈️
      </div>
      <h3 className="text-3xl font-black tracking-tighter mb-2" style={{ color: "var(--text-primary)" }}>
        No trips yet
      </h3>
      <p className="font-semibold mb-8" style={{ color: "var(--text-muted)" }}>
        Your adventure archive is empty — start planning!
      </p>
      <Link href="/dashboard/planner"
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:-translate-y-1 hover:shadow-xl"
        style={{ background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary,#8b5cf6))" }}>
        <Plus className="w-4 h-4" /> Plan Your First Trip
      </Link>
    </div>
  );
}

/* ── Trip Card ───────────────────────────────────────────────── */
function TripCard({ trip, onDelete, onDuplicate, onFavorite, loading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actioning, setActioning] = useState(null);
  const days = getDays(trip.start_date, trip.end_date) || trip.duration_days;
  const vibe = getVibe(trip.destination);
  const isFav = trip.is_favorite || (trip.tags || []).includes("favorite");

  const handle = async (fn, label) => {
    setActioning(label); setMenuOpen(false);
    try { await fn(); } catch (e) { alert(e?.response?.data?.detail || "Action failed"); }
    setActioning(null);
  };

  const tc = trip.budget_summary?.total_cost;
  const budget = trip.budget;
  const pct = budget && tc ? Math.min(100, Math.round((tc / budget) * 100)) : null;
  const sel = trip.transport?.provider || trip.transport?.mode || null;
  const hotel = trip.stay?.name || null;

  return (
    <div className="group rounded-3xl border overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2"
      style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>

      {/* Card header gradient */}
      <div className="relative h-32 flex items-end p-5"
        style={{ background: "linear-gradient(135deg,var(--accent-primary)18,var(--accent-secondary,#8b5cf6)10)" }}>
        <span className="text-5xl absolute top-4 right-5 opacity-80">{vibe}</span>
        <div className="flex-1">
          <h3 className="text-xl font-black tracking-tight leading-tight group-hover:opacity-90 transition-opacity"
            style={{ color: "var(--text-primary)" }}>
            {trip.destination}
          </h3>
          {trip.source && (
            <p className="text-xs font-semibold flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
              <Plane className="w-3 h-3" /> from {trip.source}
            </p>
          )}
        </div>
        {/* Favorite + Menu */}
        <div className="flex items-center gap-2 absolute top-3 left-4">
          <button onClick={() => handle(onFavorite, "fav")} disabled={actioning === "fav"}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:scale-110"
            style={{ background: "var(--card-bg)", color: isFav ? "#ef4444" : "var(--text-muted)" }}>
            {actioning === "fav" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />}
          </button>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((p) => !p)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:scale-110"
            style={{ background: "var(--card-bg)", color: "var(--text-muted)" }}>
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 rounded-2xl border shadow-2xl overflow-hidden min-w-[160px]"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
              {[
                { icon: Copy, label: "Duplicate", key: "dup", fn: onDuplicate },
                { icon: Trash2, label: "Delete", key: "del", fn: onDelete, danger: true },
              ].map(({ icon: Icon, label, key, fn, danger }) => (
                <button key={key} disabled={actioning === key}
                  onClick={() => handle(fn, key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-opacity-50 transition-colors"
                  style={{ color: danger ? "#ef4444" : "var(--text-primary)" }}>
                  {actioning === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info chips */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {days && (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background: "var(--accent-soft)", color: "var(--accent-primary)" }}>
              <Clock className="w-3 h-3" /> {days}d
            </span>
          )}
          {trip.num_travelers && (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
              <Users className="w-3 h-3" /> {trip.num_travelers}
            </span>
          )}
          {trip.group_type && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl capitalize"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
              {trip.group_type}
            </span>
          )}
        </div>

        {/* Dates + Budget */}
        <div className="grid grid-cols-2 gap-3">
          {(trip.start_date || trip.end_date) && (
            <div className="rounded-2xl p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Dates</p>
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                {fmtDate(trip.start_date)}{trip.end_date && ` → ${fmtDate(trip.end_date)}`}
              </p>
            </div>
          )}
          {budget > 0 && (
            <div className="rounded-2xl p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Budget</p>
              <p className="text-xs font-bold text-emerald-500">{fmtRs(budget)}</p>
            </div>
          )}
        </div>

        {/* Budget bar */}
        {pct !== null && (
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>
              <span>Spent: {fmtRs(tc)}</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "var(--accent-primary)" }} />
            </div>
          </div>
        )}

        {/* Selected options preview */}
        {(sel || hotel) && (
          <div className="flex flex-col gap-1">
            {sel && <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>✈️ {sel}</p>}
            {hotel && <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>🏨 {hotel}</p>}
          </div>
        )}

        {/* Action */}
        <div className="mt-auto pt-2">
          <Link href={`/dashboard/trips/${trip.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-xs text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary,#8b5cf6))" }}>
            <Eye className="w-3.5 h-3.5" /> View Full Itinerary <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Stats Bar ───────────────────────────────────────────────── */
function StatsBar({ trips }) {
  const totBudget = trips.reduce((s, t) => s + (Number(t.budget) || 0), 0);
  const favCount = trips.filter((t) => t.is_favorite || (t.tags || []).includes("favorite")).length;
  const stats = [
    { label: "Total Trips", value: trips.length, icon: Globe, color: "#6366f1" },
    { label: "Favourites", value: favCount, icon: Heart, color: "#ef4444" },
    { label: "Total Budget", value: totBudget > 0 ? fmtRs(totBudget) : "—", icon: Wallet, color: "#10b981" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-4 rounded-3xl border p-5 transition-all hover:-translate-y-1"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
const SORTS = ["Newest", "Oldest", "Budget ↑", "Budget ↓", "Duration"];

export default function MyTripsPage() {
  const { trips, fetchMyTrips, deleteTrip, duplicateTrip, toggleFavTrip, tripsLoaded } = useTripStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [filterFav, setFilterFav] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchMyTrips(); }, []);

  const filtered = useMemo(() => {
    let list = [...trips];
    if (search) list = list.filter((t) => (t.destination || "").toLowerCase().includes(search.toLowerCase()));
    if (filterFav) list = list.filter((t) => t.is_favorite || (t.tags || []).includes("favorite"));
    switch (sortBy) {
      case "Oldest":   list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case "Budget ↑": list.sort((a, b) => (a.budget || 0) - (b.budget || 0)); break;
      case "Budget ↓": list.sort((a, b) => (b.budget || 0) - (a.budget || 0)); break;
      case "Duration": list.sort((a, b) => (b.duration_days || 0) - (a.duration_days || 0)); break;
      default:         list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [trips, search, sortBy, filterFav]);

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-5xl font-black tracking-tighter leading-none mb-2" style={{ color: "var(--text-primary)" }}>
          My Journeys<span style={{ color: "var(--accent-primary)" }}>.</span>
        </h1>
        <p className="font-semibold" style={{ color: "var(--text-muted)" }}>
          Your complete travel archive — {trips.length} trip{trips.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {/* Stats */}
      {trips.length > 0 && <StatsBar trips={trips} />}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by destination…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm font-semibold outline-none transition-all focus:ring-2"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)", "--tw-ring-color": "var(--accent-primary)" }} />
        </div>

        {/* Fav filter */}
        <button onClick={() => setFilterFav((p) => !p)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all hover:-translate-y-0.5"
          style={{ background: filterFav ? "#ef444415" : "var(--card-bg)", borderColor: filterFav ? "#ef4444" : "var(--border-color)", color: filterFav ? "#ef4444" : "var(--text-secondary)" }}>
          <Heart className={`w-4 h-4 ${filterFav ? "fill-current" : ""}`} /> Favs
        </button>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 rounded-2xl border font-bold text-sm outline-none cursor-pointer"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
          {SORTS.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Plan new */}
        <Link href="/dashboard/planner"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:-translate-y-1 hover:shadow-lg whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary,#8b5cf6))" }}>
          <Plus className="w-4 h-4" /> Plan Trip
        </Link>
      </div>

      {/* Grid */}
      {!tripsLoaded ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--accent-primary)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length === 0 ? <EmptyState /> : filtered.map((trip) => (
            <TripCard key={trip.id} trip={trip}
              onDelete={() => deleteTrip(trip.id)}
              onDuplicate={() => duplicateTrip(trip.id)}
              onFavorite={() => toggleFavTrip(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
