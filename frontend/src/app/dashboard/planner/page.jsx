"use client";
import { useState } from "react";
import { usePlannerStore } from "../../../store/plannerStore";
import {
  MapPin, Calendar, Wallet, Users, Compass, Plane, Train, Bus, Car,
  Hotel, Star, Clock, ChevronDown, ChevronUp, Flame, Sparkles,
  Crown, ArrowRight, CheckCircle, AlertTriangle, Info,
  Utensils, Camera, Zap, RotateCcw, Coffee, Sun, Moon,
  TrendingUp, Heart, Share2, Download, Map,
} from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const POPULAR_DESTINATIONS = [
  "Goa", "Kerala", "Rajasthan", "Manali", "Jaipur",
  "Bali", "Dubai", "Singapore", "Bangkok", "Maldives",
  "Leh Ladakh", "Rishikesh", "Andaman Islands", "Mumbai",
];

const GROUP_TYPES = [
  { value: "solo", label: "Solo", icon: "🧍" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "friends", label: "Friends", icon: "👫" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
];

const TRANSPORT_ICONS = { Flight: Plane, Train, Bus, "Self-Drive / Cab": Car };

// ─── HELPER UTILS ───────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));

function getTransportIcon(mode) {
  const Icon = TRANSPORT_ICONS[mode] || Plane;
  return <Icon className="w-5 h-5" />;
}

function BudgetBar({ label, amount, total, color }) {
  const pct = Math.min(100, ((amount / total) * 100)).toFixed(0);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-slate-800 dark:text-slate-200">{fmt(amount)}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ text, color = "indigo" }) {
  const map = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    green: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    orange: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    red: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${map[color] || map.indigo}`}>
      {text}
    </span>
  );
}

// ─── INPUT FORM ─────────────────────────────────────────────────────────────

function PlannerForm({ onSubmit, isPlanning }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    source: "Mumbai",
    destination: "",
    startDate: today,
    endDate: "",
    budget: 20000,
    travelers: 2,
    groupType: "friends",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const nights = form.startDate && form.endDate
    ? Math.max(0, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000))
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.destination) return;
    if (new Date(form.endDate) <= new Date(form.startDate)) return alert("End date must be after start date");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Source */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <MapPin className="w-4 h-4 inline mr-1.5 text-slate-400" />
            From (Departure City)
          </label>
          <input
            type="text"
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Compass className="w-4 h-4 inline mr-1.5 text-indigo-500" />
            To (Destination)
          </label>
          <input
            type="text"
            list="destinations-list"
            value={form.destination}
            onChange={(e) => set("destination", e.target.value)}
            placeholder="e.g. Goa, Bali, Dubai"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <datalist id="destinations-list">
            {POPULAR_DESTINATIONS.map((d) => <option key={d} value={d} />)}
          </datalist>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {POPULAR_DESTINATIONS.slice(0, 5).map((d) => (
              <button key={d} type="button"
                onClick={() => set("destination", d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  form.destination === d
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1.5 text-slate-400" />
            Start Date
          </label>
          <input
            type="date"
            min={today}
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1.5 text-slate-400" />
            End Date {nights > 0 && <span className="text-indigo-600 ml-1">({nights} night{nights !== 1 ? "s" : ""})</span>}
          </label>
          <input
            type="date"
            min={form.startDate || today}
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Wallet className="w-4 h-4 inline mr-1.5 text-emerald-500" />
            Total Budget — <span className="text-emerald-600 font-black">{fmt(form.budget)}</span>
          </label>
          <input
            type="range"
            min="5000" max="500000" step="1000"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            className="w-full accent-indigo-600 mb-2"
          />
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>₹5K</span><span>₹1L</span><span>₹2L</span><span>₹5L</span>
          </div>
          <input
            type="number"
            min="1000"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
          />
        </div>

        {/* Travelers */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <Users className="w-4 h-4 inline mr-1.5 text-slate-400" />
            Travelers — <span className="text-indigo-600 font-black">{form.travelers} person{form.travelers !== 1 ? "s" : ""}</span>
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set("travelers", Math.max(1, form.travelers - 1))}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition">
              −
            </button>
            <div className="flex-1 text-center text-2xl font-black text-indigo-600">{form.travelers}</div>
            <button type="button" onClick={() => set("travelers", Math.min(20, form.travelers + 1))}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition">
              +
            </button>
          </div>
          {form.budget && form.travelers && (
            <p className="text-xs text-slate-500 mt-2">
              ≈ {fmt(Math.round(form.budget / form.travelers))} per person
            </p>
          )}
        </div>

        {/* Group Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Group Type
          </label>
          <div className="grid grid-cols-4 gap-3">
            {GROUP_TYPES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => set("groupType", g.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold transition-all ${
                  form.groupType === g.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                }`}
              >
                <span className="text-2xl">{g.icon}</span>
                <span className="text-xs">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPlanning || !form.destination}
        className="mt-8 w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
      >
        {isPlanning ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Planning...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate My Trip Plan
          </>
        )}
      </button>
    </form>
  );
}

// ─── PROGRESS UI ────────────────────────────────────────────────────────────

function PlanningProgress({ progress, label }) {
  return (
    <div className="flex flex-col items-center py-16 gap-8">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
          <circle
            cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
            className="text-indigo-600 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-indigo-600">{progress}%</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
        <p className="text-sm text-slate-500">Building your perfect trip...</p>
      </div>

      <div className="grid grid-cols-3 gap-6 text-center">
        {[
          { icon: Compass, label: "Destinations", color: "indigo" },
          { icon: Plane, label: "Transport", color: "sky" },
          { icon: Hotel, label: "Hotels", color: "emerald" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20`}>
            <Icon className={`w-6 h-6 text-${color}-500`} />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULT: OVERVIEW SECTION ────────────────────────────────────────────────

function OverviewSection({ dest, budget, onReset }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white mb-8">
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-indigo-200" />
              <span className="text-indigo-200 font-semibold">{dest.country}</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight">{dest.name}</h2>
            <p className="text-indigo-200 mt-1 text-lg">{dest.num_days} days · {dest.nights} nights · {dest.num_travelers} traveler{dest.num_travelers !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition font-semibold text-sm backdrop-blur"
          >
            <RotateCcw className="w-4 h-4" />
            New Plan
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Budget", value: fmt(budget.total_budget), icon: Wallet },
            { label: "Estimated Cost", value: fmt(budget.total_estimated_cost), icon: TrendingUp },
            { label: "Per Person", value: fmt(budget.cost_per_person), icon: Users },
            { label: "Savings", value: fmt(budget.remaining_budget), icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <Icon className="w-4 h-4 text-indigo-200 mb-2" />
              <div className="text-xl font-black">{value}</div>
              <div className="text-indigo-200 text-xs font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-indigo-100 leading-relaxed">{dest.description}</p>

        {dest.tags && (
          <div className="flex flex-wrap gap-2 mt-4">
            {dest.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold capitalize">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESULT: TRANSPORT SECTION ───────────────────────────────────────────────

function TransportSection({ transport }) {
  const rec = transport.recommended;
  const others = transport.all_options?.filter((o) => o.mode !== rec.mode) || [];

  return (
    <div className="card-pure rounded-3xl p-6 mb-6 border border-pure">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
          <Plane className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <h3 className="text-xl font-bold text-main-pure">Transport</h3>
        <Badge text="Recommended" color="indigo" />
      </div>

      {/* Recommended */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              {getTransportIcon(rec.mode)}
            </div>
            <div>
              <div className="font-black text-lg text-indigo-800 dark:text-indigo-200">{rec.mode}</div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400">{rec.provider}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{fmt(rec.total_cost)}</div>
            <div className="text-xs text-indigo-500">{fmt(rec.cost_per_person)}/person</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm mt-3">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Clock className="w-4 h-4" />
            {rec.duration_hours}h journey
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Star className="w-4 h-4 text-yellow-500" />
            {rec.comfort_rating}/5 comfort
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            {rec.best_for}
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{rec.details}</p>
      </div>

      {/* Other options */}
      {others.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Other Options</p>
          <div className="space-y-3">
            {others.map((opt) => (
              <div key={opt.mode} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                    {getTransportIcon(opt.mode)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">{opt.mode}</div>
                    <div className="text-xs text-slate-400">{opt.duration_hours}h · {opt.best_for}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700 dark:text-slate-300">{fmt(opt.total_cost)}</div>
                  <div className="text-xs text-slate-400">{fmt(opt.cost_per_person)}/person</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESULT: STAY SECTION ────────────────────────────────────────────────────

function StaySection({ stay }) {
  const rec = stay.recommended;

  const TIER_COLORS = {
    hostel: "bg-slate-100 dark:bg-slate-800 text-slate-600",
    budget_hotel: "bg-teal-50 dark:bg-teal-900/20 text-teal-700",
    mid_range: "bg-blue-50 dark:bg-blue-900/20 text-blue-700",
    premium: "bg-purple-50 dark:bg-purple-900/20 text-purple-700",
    luxury: "bg-amber-50 dark:bg-amber-900/20 text-amber-700",
  };

  return (
    <div className="card-pure rounded-3xl p-6 mb-6 border border-pure">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
          <Hotel className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-main-pure">Accommodation</h3>
      </div>

      {/* Recommended */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-black text-xl text-emerald-800 dark:text-emerald-200">{rec.name}</div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{rec.type} · {rec.privacy}</div>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rec.rating) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"}`} />
              ))}
              <span className="text-xs text-slate-500 ml-1">{rec.rating}/5</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{fmt(rec.total_stay_cost)}</div>
            <div className="text-xs text-emerald-600">{stay.nights} nights · {rec.rooms_required} room{rec.rooms_required !== 1 ? "s" : ""}</div>
            <div className="text-xs text-slate-500 mt-1">{fmt(rec.price_per_room_per_night)}/room/night</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {rec.amenities?.map((a) => (
            <span key={a} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Tier grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {stay.all_options?.slice(0, 6).map((opt) => (
          <div
            key={opt.tier}
            className={`rounded-2xl p-4 border ${opt.is_recommended ? "border-emerald-400 dark:border-emerald-600" : "border-slate-200 dark:border-slate-700"} ${TIER_COLORS[opt.tier] || ""} bg-opacity-50`}
          >
            {opt.is_recommended && <div className="text-xs font-bold text-emerald-600 mb-1">⭐ Best Pick</div>}
            <div className="font-bold text-sm">{opt.type}</div>
            <div className="text-xs opacity-70 mt-1">{fmt(opt.total_stay_cost)}</div>
            <div className="text-xs opacity-60">{fmt(opt.price_per_room_per_night)}/night</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULT: ITINERARY SECTION ───────────────────────────────────────────────

function ItinerarySection({ itinerary }) {
  const [expandedDay, setExpandedDay] = useState(0);

  const TYPE_COLORS = {
    beach: "text-sky-500",
    adventure: "text-orange-500",
    culture: "text-purple-500",
    heritage: "text-amber-500",
    nature: "text-emerald-500",
    food: "text-red-400",
    landmark: "text-blue-500",
    market: "text-pink-500",
    shopping: "text-fuchsia-500",
    nightlife: "text-violet-500",
  };

  const TYPE_ICONS = {
    beach: "🏖️", adventure: "🏔️", culture: "🎭", heritage: "🏛️",
    nature: "🌿", food: "🍽️", landmark: "🗼", market: "🛍️",
    shopping: "🛒", nightlife: "🎵", general: "📍",
  };

  return (
    <div className="card-pure rounded-3xl p-6 mb-6 border border-pure">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
          <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-main-pure">Day-by-Day Itinerary</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 ml-14">{itinerary.summary}</p>

      <div className="space-y-3">
        {itinerary.days?.map((day, idx) => (
          <div key={day.day} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition-all">
            {/* Day header */}
            <button
              className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              onClick={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  D{day.day}
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{day.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{day.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {day.activities?.filter(a => a.type !== "food").length} activities
                </span>
                {expandedDay === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {/* Day content */}
            {expandedDay === idx && (
              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-4">{day.notes}</p>
                {day.activities?.map((act, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                        {TYPE_ICONS[act.type] || "📍"}
                      </div>
                      {i < day.activities.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`text-xs font-bold ${TYPE_COLORS[act.type] || "text-slate-400"} mb-0.5`}>{act.time}</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{act.place}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{act.description}</div>
                        </div>
                        {act.duration && (
                          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg ml-3 flex-shrink-0">
                            {act.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULT: BUDGET SECTION ──────────────────────────────────────────────────

function BudgetSection({ budget }) {
  const breakdown = budget.breakdown || {};
  const colors = {
    transport: "bg-sky-500",
    accommodation: "bg-emerald-500",
    meals: "bg-orange-400",
    activities: "bg-purple-500",
    local_transport: "bg-pink-400",
    miscellaneous: "bg-slate-400",
  };
  const labels = {
    transport: "✈️ Transport",
    accommodation: "🏨 Accommodation",
    meals: "🍽️ Meals",
    activities: "🎯 Activities",
    local_transport: "🚕 Local Transport",
    miscellaneous: "🎁 Miscellaneous",
  };

  const pct = budget.budget_utilization_pct || 0;
  const within = budget.within_budget;

  return (
    <div className="card-pure rounded-3xl p-6 mb-6 border border-pure">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-main-pure">Budget Breakdown</h3>
        <Badge text={within ? "Within Budget ✓" : "Over Budget ⚠️"} color={within ? "green" : "red"} />
      </div>

      {/* Budget meter */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-bold mb-2">
          <span className="text-slate-600 dark:text-slate-400">Budget Used</span>
          <span className={within ? "text-emerald-600" : "text-red-500"}>{pct}%</span>
        </div>
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${within ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-orange-400 to-red-500"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>₹0</span>
          <span>{fmt(budget.total_budget)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Budget", value: fmt(budget.total_budget), color: "slate" },
          { label: "Estimated Cost", value: fmt(budget.total_estimated_cost), color: within ? "emerald" : "red" },
          { label: "Savings", value: within ? fmt(budget.remaining_budget) : `−${fmt(budget.over_budget)}`, color: within ? "emerald" : "red" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`text-center p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800`}>
            <div className={`text-xl font-black text-${color}-700 dark:text-${color}-300`}>{value}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Breakdown bars */}
      <div className="space-y-4">
        {Object.entries(breakdown).filter(([k]) => k !== "total_estimated").map(([key, amount]) => (
          <BudgetBar
            key={key}
            label={labels[key] || key}
            amount={amount}
            total={budget.total_budget}
            color={colors[key] || "bg-slate-400"}
          />
        ))}
      </div>

      {/* Per person breakdown */}
      {budget.per_person_breakdown && (
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Per Person Breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(budget.per_person_breakdown).filter(([k]) => k !== "total_estimated").map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-slate-500">{labels[key]?.replace(/[^\s\w]/g, "").trim() || key}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black">
            <span className="text-slate-700 dark:text-slate-300">Total Per Person</span>
            <span className="text-indigo-600">{fmt(budget.cost_per_person)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESULT: ALTERNATIVES ────────────────────────────────────────────────────

function AlternativesSection({ alternatives }) {
  const ICONS = { A: "💰", B: "✨", C: "👑" };
  const COLORS = {
    A: "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20",
    B: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20",
    C: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20",
  };

  return (
    <div className="card-pure rounded-3xl p-6 mb-6 border border-pure">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-main-pure">Alternative Plans</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alternatives.map((alt) => (
          <div key={alt.variant} className={`rounded-2xl border p-5 ${COLORS[alt.variant] || ""}`}>
            <div className="text-2xl mb-2">{ICONS[alt.variant]}</div>
            <div className="font-black text-slate-800 dark:text-slate-200">{alt.label}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{alt.description}</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Transport</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{alt.transport}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stay</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-right text-xs">{alt.stay}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-400">Estimated Total</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{fmt(alt.estimated_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Per Person</span>
                <span className="font-bold text-indigo-600">{fmt(alt.cost_per_person)}</span>
              </div>
              {alt.savings > 0 && (
                <div className="mt-2 text-xs text-emerald-600 font-semibold">
                  💰 Saves {fmt(alt.savings)} vs budget
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULT: HIGHLIGHTS & TIPS ───────────────────────────────────────────────

function HighlightsSection({ dest, tips, warnings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Highlights */}
      <div className="card-pure rounded-3xl p-6 border border-pure">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <Camera className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-main-pure">Must-Visit</h3>
        </div>
        <ul className="space-y-2.5">
          {dest.highlights?.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Food + Tips */}
      <div className="space-y-4">
        <div className="card-pure rounded-3xl p-5 border border-pure">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-4 h-4 text-orange-500" />
            <h4 className="font-bold text-main-pure">Local Cuisine</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {dest.local_cuisine?.map((c) => (
              <span key={c} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-xl border border-orange-200 dark:border-orange-800">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="card-pure rounded-3xl p-5 border border-pure">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-main-pure">Weather</h4>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{dest.weather}</p>
        </div>
      </div>

      {/* Travel Tips */}
      {tips?.length > 0 && (
        <div className="md:col-span-2 card-pure rounded-3xl p-6 border border-pure">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
              <Info className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-main-pure">Travel Tips</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings?.length > 0 && (
        <div className="md:col-span-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">Planning Notes</span>
          </div>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-700 dark:text-amber-300">{w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { isPlanning, result, error, progress, progressLabel, planTrip, resetPlan } = usePlannerStore();

  return (
    <div className="max-w-5xl mx-auto pb-20">

      {!result ? (
        <>
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Compass className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-main-pure tracking-tight">Plan a Trip</h1>
                <p className="text-muted-pure text-sm">Fast, deterministic planning — results in under 1 second</p>
              </div>
            </div>
          </div>

          {/* Main card */}
          <div className="card-pure rounded-[2rem] p-8 border border-pure shadow-xl">
            {isPlanning ? (
              <PlanningProgress progress={progress} label={progressLabel} />
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                  </div>
                )}
                <PlannerForm onSubmit={planTrip} isPlanning={isPlanning} />
              </>
            )}
          </div>

          {/* Features grid */}
          {!isPlanning && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Zap, label: "Instant Results", desc: "< 1 second", color: "yellow" },
                { icon: CheckCircle, label: "No AI Hallucinations", desc: "Rule-based engine", color: "emerald" },
                { icon: Wallet, label: "Budget Optimizer", desc: "Iterative solver", color: "blue" },
                { icon: Sparkles, label: "3 Plan Variants", desc: "Budget / Comfort / Luxury", color: "purple" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className={`card-pure rounded-2xl p-5 border border-${color}-100 dark:border-${color}-900/40 text-center`}>
                  <div className={`w-10 h-10 rounded-2xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                  </div>
                  <div className="font-bold text-sm text-main-pure">{label}</div>
                  <div className="text-xs text-muted-pure mt-1">{desc}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Results */}
          <OverviewSection dest={result.destination} budget={result.budget} onReset={resetPlan} />
          <TransportSection transport={result.transport} />
          <StaySection stay={result.stay} />
          <ItinerarySection itinerary={result.itinerary} />
          <BudgetSection budget={result.budget} />
          <AlternativesSection alternatives={result.alternatives || []} />
          <HighlightsSection dest={result.destination} tips={result.tips} warnings={result.warnings} />

          {/* Planning time badge */}
          <div className="text-center mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-500 font-medium">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              Plan generated in {result.planning_time_ms?.toFixed(0)}ms
            </span>
          </div>
        </>
      )}
    </div>
  );
}
