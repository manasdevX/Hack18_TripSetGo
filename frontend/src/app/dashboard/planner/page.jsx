"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlannerStore } from "../../../store/plannerStore";
import { useTripStore } from "../../../store/tripStore";
import { useNotificationStore } from "../../../store/notificationStore";
import {
  MapPin, Calendar, Wallet, Users, Compass, Plane, Train, Bus, Car,
  Hotel, Star, Clock, ChevronDown, ChevronUp, Sparkles, CheckCircle,
  AlertTriangle, Info, Utensils, Zap, RotateCcw,
  Heart, Globe, TrendingUp, ArrowRight, Navigation,
  Filter, BookmarkPlus, Database, Loader2, PartyPopper,
} from "lucide-react";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const TRANSPORT_ICON = { Flight: Plane, Train, Bus, "Self-Drive / Cab": Car };
const POPULAR_DESTINATIONS = ["Goa", "Kerala", "Rajasthan", "Manali", "Jaipur", "Bali", "Dubai", "Singapore", "Bangkok", "Maldives", "Leh Ladakh", "Rishikesh"];
const GROUP_TYPES = [
  { value: "solo", label: "Solo", icon: "🧍" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "friends", label: "Friends", icon: "👫" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
];
const PREFS = ["beach", "adventure", "culture", "nature", "food", "nightlife", "luxury", "history", "wildlife", "shopping"];
const VIBE_GRADIENT = {
  beach: "from-cyan-500 to-blue-600",
  mountain: "from-emerald-600 to-teal-800",
  city: "from-indigo-600 to-purple-700",
  heritage: "from-amber-500 to-orange-600",
  island: "from-teal-400 to-cyan-600",
  desert: "from-orange-400 to-red-500",
};
const SLOT_ICONS = { morning: "🌅", afternoon: "☀️", evening: "🌆" };
const SLOT_COLORS = {
  morning: "from-amber-400 to-orange-500",
  afternoon: "from-sky-400 to-blue-500",
  evening: "from-purple-500 to-indigo-600",
};
const TYPE_EMOJI = { adventure: "🏔️", culture: "🎭", relaxation: "☕", food: "🍽️", nature: "🌿", shopping: "🛍️", relaxation: "😌", landmark: "🗼", arrival: "✈️", departure: "🧳" };

function TierBadge({ tier }) {
  const map = { budget: "bg-emerald-100 text-emerald-700", standard: "bg-blue-100 text-blue-700", premium: "bg-purple-100 text-purple-700", luxury: "bg-amber-100 text-amber-700" };
  const labels = { budget: "💚 Budget", standard: "⭐ Standard", premium: "💎 Premium", luxury: "👑 Luxury" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${map[tier] || "bg-slate-100 text-slate-600"}`}>{labels[tier] || tier}</span>;
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
      ))}
      <span className="text-xs text-slate-400 ml-1">{rating}</span>
    </div>
  );
}

// ─── LIVE BUDGET TRACKER ─────────────────────────────────────────────────────

function BudgetTracker({ plan }) {
  const { getLiveCost } = usePlannerStore();
  const costs = getLiveCost();
  const total = plan?.meta?.total_budget || 0;
  const used = costs.total;
  const remaining = total - used;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const status = pct < 75 ? "green" : pct < 95 ? "yellow" : "red";

  const barColor = { green: "from-emerald-400 to-emerald-600", yellow: "from-yellow-400 to-orange-500", red: "from-red-400 to-red-600" };
  const textColor = { green: "text-emerald-600", yellow: "text-orange-500", red: "text-red-500" };

  return (
    <div className="sticky top-4 z-20">
      <div className="card-pure rounded-3xl p-5 border border-pure shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <span className="font-black text-main-pure text-sm">Live Budget</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status === "green" ? "bg-emerald-100 text-emerald-700" : status === "yellow" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
            {pct}% used
          </span>
        </div>

        {/* Big numbers */}
        <div className="text-center mb-4">
          <div className={`text-3xl font-black ${textColor[status]}`}>{fmt(used)}</div>
          <div className="text-xs text-slate-400 mt-0.5">of {fmt(total)}</div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full bg-gradient-to-r ${barColor[status]} transition-all duration-500`}
            style={{ width: `${pct}%` }} />
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          {[
            { label: "✈️ Transport", val: costs.transport },
            { label: "🏨 Hotel", val: costs.hotel },
            { label: "🍽️ Food", val: costs.food },
            { label: "🎯 Activities", val: costs.activities },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-slate-500">{label}</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(val)}</span>
            </div>
          ))}
        </div>

        {/* Remaining */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Remaining</span>
            <span className={`font-black text-lg ${remaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {remaining >= 0 ? fmt(remaining) : `-${fmt(-remaining)}`}
            </span>
          </div>
          {remaining > 0 && remaining / total > 0.15 && (
            <div className="mt-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                💡 You have {fmt(remaining)} left — upgrade your hotel or add premium activities!
              </p>
            </div>
          )}
          {remaining < 0 && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                ⚠️ Over budget by {fmt(-remaining)}. Try a cheaper hotel or transport.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TRANSPORT SELECTOR ───────────────────────────────────────────────────────

function TransportSelector({ options }) {
  const { selectedTransport, selectTransport } = usePlannerStore();
  const TIcon = (opt) => {
    const text = (opt.mode + " " + opt.provider).toLowerCase();
    if (text.includes("train") || text.includes("railway") || text.includes("express") || text.includes("irctc")) return <Train className="w-5 h-5" />;
    if (text.includes("cab") || text.includes("car") || text.includes("taxi") || text.includes("private") || text.includes("drive")) return <Car className="w-5 h-5" />;
    if (text.includes("bus") || text.includes("volvo") || text.includes("coach") || text.includes("travels")) return <Bus className="w-5 h-5" />;
    return <Plane className="w-5 h-5" />;
  };

  return (
    <div>
      <h3 className="text-lg font-black text-main-pure mb-4 flex items-center gap-2">
        <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-xl"><Navigation className="w-5 h-5 text-sky-500" /></div>
        Transport Options
        <span className="text-xs text-slate-400 font-normal ml-1">— choose one</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options?.map((opt) => {
          const sel = selectedTransport === opt.id;
          return (
            <button key={opt.id} onClick={() => selectTransport(opt.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${sel ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-100 dark:shadow-sky-900/20 scale-[1.02]" : "border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:scale-[1.01]"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${sel ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"} transition-colors`}>
                    {TIcon(opt)}
                  </div>
                  <div>
                    <div className="font-black text-main-pure">{opt.mode}</div>
                    <div className="text-xs text-slate-400">{opt.provider}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black text-lg ${sel ? "text-sky-600" : "text-slate-700 dark:text-slate-300"}`}>{fmt(opt.total_cost)}</div>
                  <div className="text-xs text-slate-400">{fmt(opt.cost_per_person)}/person</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{opt.duration}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{opt.comfort}/5 comfort</span>
              </div>
              {opt.highlights?.[0] && <p className="text-xs text-slate-400 line-clamp-2">{opt.highlights[0]}</p>}
              <div className="flex items-center justify-between mt-3">
                {opt.recommended && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⭐ Recommended</span>}
                <div className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${sel ? "border-sky-500 bg-sky-500" : "border-slate-300 dark:border-slate-600"}`}>
                  {sel && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── HOTEL SELECTOR ───────────────────────────────────────────────────────────

function HotelSelector({ options, nights }) {
  const { selectedHotel, selectHotel, savedFavorites, toggleFavorite } = usePlannerStore();

  return (
    <div>
      <h3 className="text-lg font-black text-main-pure mb-4 flex items-center gap-2">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl"><Hotel className="w-5 h-5 text-emerald-500" /></div>
        Accommodation Options
        <span className="text-xs text-slate-400 font-normal ml-1">— {nights} nights</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options?.map((hotel) => {
          const sel = selectedHotel === hotel.id;
          const fav = savedFavorites.includes(hotel.id);
          return (
            <div key={hotel.id}
              className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-200 ${sel ? "border-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 scale-[1.02]" : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:scale-[1.01]"}`}>
              {/* Tier color bar */}
              <div className={`h-1.5 w-full ${hotel.tier === "luxury" ? "bg-gradient-to-r from-amber-400 to-yellow-500" : hotel.tier === "premium" ? "bg-gradient-to-r from-purple-400 to-pink-500" : hotel.tier === "standard" || hotel.tier === "mid_range" ? "bg-gradient-to-r from-blue-400 to-sky-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-black text-main-pure text-base mb-1">{hotel.name}</div>
                    <TierBadge tier={hotel.tier} />
                    <div className="mt-2"><StarRating rating={hotel.rating} /></div>
                    <div className="text-xs text-slate-400 mt-1">📍 {hotel.location}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className={`font-black text-xl ${sel ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>{fmt(hotel.price_per_night)}</div>
                    <div className="text-xs text-slate-400">/night</div>
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">{fmt(hotel.total_stay_cost)}</div>
                    <div className="text-xs text-slate-400">total</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {hotel.amenities?.slice(0, 4).map((a) => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">{a}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => selectHotel(hotel.id)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${sel ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}>
                    {sel ? "✓ Selected" : "Select"}
                  </button>
                  <button onClick={() => toggleFavorite(hotel.id)}
                    className={`p-2 rounded-xl transition-all ${fav ? "bg-red-100 text-red-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-400"}`}>
                    <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
                  </button>
                </div>
                {hotel.recommended && <div className="mt-2 text-center text-xs text-amber-600 font-semibold">⭐ Best value pick</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FOOD PLAN SELECTOR ───────────────────────────────────────────────────────

function FoodPlanSelector({ plans }) {
  const { selectedFood, selectFood } = usePlannerStore();

  return (
    <div>
      <h3 className="text-lg font-black text-main-pure mb-4 flex items-center gap-2">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl"><Utensils className="w-5 h-5 text-orange-500" /></div>
        Food Experience
        <span className="text-xs text-slate-400 font-normal ml-1">— daily dining</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.map((plan, i) => {
          const sel = selectedFood === plan.id;
          const colors = [
            "border-teal-200 bg-teal-50 dark:bg-teal-900/20",
            "border-orange-200 bg-orange-50 dark:bg-orange-900/20",
            "border-purple-200 bg-purple-50 dark:bg-purple-900/20",
          ];
          const textColors = ["text-teal-700 dark:text-teal-300", "text-orange-700 dark:text-orange-300", "text-purple-700 dark:text-purple-300"];
          return (
            <button key={plan.id} onClick={() => selectFood(plan.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${sel ? `${colors[i % 3]} shadow-lg scale-[1.03]` : "border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:scale-[1.01]"}`}>
              <div className="text-2xl mb-2">{"🍜🍽️🥂"[i]}</div>
              <div className="font-black text-main-pure mb-1">{plan.name}</div>
              <div className="text-xs text-slate-500 mb-3">{plan.description}</div>
              <div className={`text-2xl font-black ${sel ? textColors[i % 3] : "text-slate-700 dark:text-slate-300"}`}>{fmt(plan.cost_per_day)}</div>
              <div className="text-xs text-slate-400">/day · {fmt(plan.total_cost)} total</div>
              <div className="mt-3 space-y-1">
                {plan.highlights?.slice(0, 3).map((h) => (
                  <div key={h} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />{h}
                  </div>
                ))}
              </div>
              {plan.recommended && <div className="mt-3 text-xs text-orange-600 font-bold">🌟 Most popular</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY SELECTOR (per day + slot) ───────────────────────────────────────

function ActivitySlot({ dayNum, slot, activities, slotLabel }) {
  const { selectedActivities, selectActivity, savedFavorites, toggleFavorite } = usePlannerStore();
  const key = `d${dayNum}_${slot}`;
  const selectedId = selectedActivities[key];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${SLOT_COLORS[slot]} flex items-center justify-center text-sm`}>
          {SLOT_ICONS[slot]}
        </div>
        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{slotLabel}</span>
        <span className="text-xs text-slate-400">{activities?.length} options</span>
      </div>
      <div className="space-y-2">
        {activities?.map((act, i) => {
          const sel = selectedId === act.id;
          const fav = savedFavorites.includes(act.id);
          return (
            <div key={act.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer group ${sel ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm" : "border-slate-200 dark:border-slate-700 hover:border-indigo-200"}`}
              onClick={() => selectActivity(key, act.id)}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${sel ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                {TYPE_EMOJI[act.type] || "📍"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${sel ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>{act.name}</span>
                  {i === 0 && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">Popular</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{act.duration}</span>
                  {act.cost > 0 && <span className="text-xs font-semibold text-emerald-600">{fmt(act.cost)}</span>}
                  {act.cost === 0 && <span className="text-xs font-semibold text-slate-400">Free</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(act.id); }}
                  className={`p-1.5 rounded-lg ${fav ? "text-red-500" : "text-slate-300 dark:text-slate-600 group-hover:text-red-300"} transition-colors`}>
                  <Heart className={`w-3.5 h-3.5 ${fav ? "fill-current" : ""}`} />
                </button>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sel ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-600"}`}>
                  {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayPlanner({ day, index }) {
  const [open, setOpen] = useState(index === 0);
  const { selectedActivities } = usePlannerStore();
  const selCount = ["morning", "afternoon", "evening"].filter((s) => selectedActivities[`d${day.day}_${s}`]).length;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm">
            D{day.day}
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">{day.day_summary}</div>
            <div className="text-xs text-slate-400 mt-0.5">{day.date}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
            {selCount}/3 slots filled
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="p-5 border-t border-slate-200 dark:border-slate-700">
          <ActivitySlot dayNum={day.day} slot="morning" activities={day.morning?.activities} slotLabel="Morning Activities" />
          <ActivitySlot dayNum={day.day} slot="afternoon" activities={day.afternoon?.activities} slotLabel="Afternoon Highlights" />
          <ActivitySlot dayNum={day.day} slot="evening" activities={day.evening?.activities} slotLabel="Evening Plans" />
        </div>
      )}
    </div>
  );
}

// ─── AI SUGGESTIONS BAR ───────────────────────────────────────────────────────

function AISuggestions({ suggestions }) {
  if (!suggestions?.length) return null;
  const bg = { upgrade: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800", tip: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", romantic: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800", adventure: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" };
  return (
    <div>
      <h3 className="text-lg font-black text-main-pure mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" /> AI Suggestions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${bg[s.type] || bg.tip}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{s.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</div>
                {s.potential_cost > 0 && <div className="text-xs font-semibold text-indigo-600 mt-1">+{fmt(s.potential_cost)}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────

function HeroSection({ plan, onReset }) {
  const meta = plan.meta || {};
  const vibe = plan.ui?.destination_vibe || "city";
  const gradient = VIBE_GRADIENT[vibe] || VIBE_GRADIENT.city;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white mb-8`}>
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">{meta.source} → {meta.destination}</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{meta.destination}</h2>
            <p className="text-white/80 mt-1">{meta.total_days} days · {meta.num_travelers} traveler{meta.num_travelers !== 1 ? "s" : ""} · {meta.group_type} · {meta.theme?.toUpperCase()}</p>
          </div>
          <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition font-semibold text-sm">
            <RotateCcw className="w-4 h-4" /> New Plan
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Budget", val: fmt(meta.total_budget) },
            { label: "Days", val: `${meta.total_days} days` },
            { label: "Nights", val: `${meta.total_nights} nights` },
            { label: "Group", val: meta.group_type },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="text-lg font-black">{val}</div>
              <div className="text-white/60 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-white/90 italic text-sm">"{meta.summary_text}"</p>
        {meta.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {meta.tags.map((t) => (
              <span key={t} className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold capitalize">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLANNER FORM ─────────────────────────────────────────────────────────────

function PlannerForm({ onSubmit, isPlanning, error }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ source: "Mumbai", destination: "", startDate: today, endDate: "", budget: 50000, travelers: 2, groupType: "friends", preferences: [] });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const togglePref = (p) => setF("preferences", form.preferences.includes(p) ? form.preferences.filter((x) => x !== p) : [...form.preferences, p]);
  const nights = form.startDate && form.endDate ? Math.max(0, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000)) : 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.destination || !form.endDate) return; if (new Date(form.endDate) <= new Date(form.startDate)) return alert("End date must be after start date"); onSubmit(form); }} className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><MapPin className="w-4 h-4 inline mr-1.5 text-slate-400" />From</label>
          <input type="text" value={form.source} onChange={(e) => setF("source", e.target.value)} placeholder="Mumbai, Delhi..." required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><Compass className="w-4 h-4 inline mr-1.5 text-indigo-500" />To (Destination)</label>
          <input type="text" list="dest-list" value={form.destination} onChange={(e) => setF("destination", e.target.value)} placeholder="Goa, Bali, Dubai..." required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          <datalist id="dest-list">{POPULAR_DESTINATIONS.map((d) => <option key={d} value={d} />)}</datalist>
          <div className="flex flex-wrap gap-1.5 mt-2">{POPULAR_DESTINATIONS.slice(0, 6).map((d) => (<button key={d} type="button" onClick={() => setF("destination", d)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${form.destination === d ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300"}`}>{d}</button>))}</div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><Calendar className="w-4 h-4 inline mr-1.5 text-slate-400" />Start Date</label>
          <input type="date" min={today} value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><Calendar className="w-4 h-4 inline mr-1.5 text-slate-400" />End Date{nights > 0 && <span className="text-indigo-600 ml-1 font-normal">({nights} nights)</span>}</label>
          <input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => setF("endDate", e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><Wallet className="w-4 h-4 inline mr-1.5 text-emerald-500" />Budget — <span className="text-emerald-600 font-black">{fmt(form.budget)}</span></label>
          <input type="range" min="5000" max="500000" step="1000" value={form.budget} onChange={(e) => setF("budget", e.target.value)} className="w-full accent-indigo-600 mb-2" />
          <input type="number" min="1000" value={form.budget} onChange={(e) => setF("budget", e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"><Users className="w-4 h-4 inline mr-1.5 text-slate-400" />Travelers — <span className="text-indigo-600 font-black">{form.travelers}</span></label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setF("travelers", Math.max(1, form.travelers - 1))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg hover:bg-indigo-100 transition">−</button>
            <div className="flex-1 text-center text-2xl font-black text-indigo-600">{form.travelers}</div>
            <button type="button" onClick={() => setF("travelers", Math.min(20, form.travelers + 1))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-lg hover:bg-indigo-100 transition">+</button>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Group Type</label>
          <div className="grid grid-cols-4 gap-3">
            {GROUP_TYPES.map((g) => (<button key={g.value} type="button" onClick={() => setF("groupType", g.value)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold transition-all ${form.groupType === g.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300"}`}><span className="text-2xl">{g.icon}</span><span className="text-xs">{g.label}</span></button>))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Trip Vibe <span className="font-normal text-slate-400">(select all that apply)</span></label>
          <div className="flex flex-wrap gap-2">{PREFS.map((p) => (<button key={p} type="button" onClick={() => togglePref(p)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition border capitalize ${form.preferences.includes(p) ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300"}`}>{p}</button>))}</div>
        </div>
      </div>
      <button type="submit" disabled={isPlanning || !form.destination} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white font-black text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
        {isPlanning ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI is building your plan...</>) : (<><Sparkles className="w-5 h-5" />Generate Interactive Trip Plan</>)}
      </button>
    </form>
  );
}

// ─── LOADING ──────────────────────────────────────────────────────────────────

function PlanningProgress({ progress, label }) {
  return (
    <div className="flex flex-col items-center py-16 gap-8">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 50}`} strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`} className="text-indigo-600 transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" /></div>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">{label}</p>
        <p className="text-sm text-slate-500">Groq AI + real data tools</p>
      </div>
      <div className="w-full max-w-sm">
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">{progress}%</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { isPlanning, plan, error, progress, progressLabel, planTrip, resetPlan, saveTrip, isSaving, savedTripId } = usePlannerStore();
  const { fetchMyTrips } = useTripStore();
  const { fetchNotifications } = useNotificationStore();
  const nights = plan?.meta?.total_nights || 0;
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedTrip, setSavedTrip] = useState(null);
  const formDataRef = useRef(null);
  const router = useRouter();

  const handleSaveTrip = async () => {
    try {
      const res = await saveTrip(formDataRef.current);
      const trip = res?.trip;
      setSavedTrip(trip || null);
      setSaveSuccess(true);
      // Refresh My Trips list and notifications in background
      fetchMyTrips();
      fetchNotifications();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to save trip. Please try again.");
    }
  };

  // Build Google Calendar deep link for accepted trips
  const buildGCalLink = (trip, formData) => {
    if (!trip || !formData) return null;
    const title = encodeURIComponent(`${trip.destination} Trip`);
    const details = encodeURIComponent(`Trip planned with TripSetGo. Destination: ${trip.destination}`);
    const startDate = (formData.startDate || "").replace(/-/g, "");
    const endDate = (formData.endDate || "").replace(/-/g, "");
    if (!startDate || !endDate) return null;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  if (plan && plan.meta && plan.itinerary) {
    return (
      <div className="max-w-7xl mx-auto pb-20">
        {/* Save success toast */}
        {saveSuccess && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-bold shadow-2xl animate-in slide-in-from-bottom-4"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
            <PartyPopper className="w-5 h-5" />
            Trip saved to My Journeys!
            <button onClick={() => router.push("/dashboard/trips")} className="ml-2 underline text-sm font-semibold">View →</button>
          </div>
        )}
        <HeroSection plan={plan} onReset={resetPlan} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card-pure rounded-3xl p-6 border border-pure">
              <TransportSelector options={plan.transport_options} />
            </div>
            <div className="card-pure rounded-3xl p-6 border border-pure">
              <HotelSelector options={plan.hotel_options} nights={nights} />
            </div>
            <div className="card-pure rounded-3xl p-6 border border-pure">
              <FoodPlanSelector plans={plan.food_plans} />
            </div>
            <div className="card-pure rounded-3xl p-6 border border-pure">
              <h3 className="text-lg font-black text-main-pure mb-2 flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl"><Calendar className="w-5 h-5 text-purple-500" /></div>
                Day-by-Day Planner
                <span className="text-xs text-slate-400 font-normal ml-1">— pick your activities</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5 ml-12">{plan.itinerary?.length} days · 3 time slots per day · 3 options per slot</p>
              <div className="space-y-3">
                {plan.itinerary?.map((day, i) => <DayPlanner key={day.day} day={day} index={i} />)}
              </div>
            </div>
            {plan.ai_suggestions && (
              <div className="card-pure rounded-3xl p-6 border border-pure">
                <AISuggestions suggestions={plan.ai_suggestions} />
              </div>
            )}
          </div>

          {/* Sidebar: Budget Tracker + Save + Meta */}
          <div className="lg:col-span-1 space-y-4">
            <BudgetTracker plan={plan} />

            {/* Accept Plan / Save Trip */}
            <div className="card-pure rounded-3xl p-5 border border-pure">
              <h4 className="font-black text-main-pure mb-1 flex items-center gap-2 text-sm">
                <BookmarkPlus className="w-4 h-4 text-indigo-500" /> Accept Plan
              </h4>
              <p className="text-xs text-slate-400 mb-4">Lock in your selections and add to My Trips.</p>

              {savedTripId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> Saved to My Trips!
                  </div>
                  <button onClick={() => router.push("/dashboard/trips")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-xs border transition-all hover:bg-indigo-50"
                    style={{ borderColor: "var(--border-color)", color: "var(--accent-primary)" }}>
                    View in My Trips <ArrowRight className="w-3 h-3" />
                  </button>
                  {/* Google Calendar link */}
                  {buildGCalLink(savedTrip, formDataRef.current) && (
                    <a
                      href={buildGCalLink(savedTrip, formDataRef.current)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-xs border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Add to Google Calendar
                    </a>
                  )}
                </div>
              ) : (
                <button onClick={handleSaveTrip} disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-60 shadow-lg shadow-indigo-100"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><BookmarkPlus className="w-4 h-4" /> ✅ Accept &amp; Save Trip</>}
                </button>
              )}
            </div>

            {/* RAG + AI Meta */}
            <div className="card-pure rounded-3xl p-5 border border-pure">
              <h4 className="font-black text-main-pure mb-3 flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-indigo-500" /> RAG Vector Store
              </h4>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>Vector DB Size</span><span className="font-semibold text-slate-700 dark:text-slate-300">{plan._meta?.vector_store_size || 135} entries</span></div>
                <div className="flex justify-between"><span>Retrieved</span><span className="font-semibold text-emerald-600">{plan._meta?.rag_retrieved || 0} items</span></div>
                <div className="flex justify-between"><span>Model</span><span className="font-semibold text-slate-700 dark:text-slate-300">{plan._meta?.model?.includes("llama") ? "Llama 3.3 70B" : "Fallback"}</span></div>
                <div className="flex justify-between"><span>Time</span><span className="font-semibold text-slate-700 dark:text-slate-300">{plan._meta?.planning_time_ms?.toFixed(0)}ms</span></div>
                <div className="flex justify-between"><span>LLM</span><span className={`font-semibold ${plan._meta?.llm_used ? "text-emerald-600" : "text-amber-600"}`}>{plan._meta?.llm_used ? "✓ Groq" : "Deterministic"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-xl">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-main-pure tracking-tight">AI Trip Planner</h1>
            <p className="text-muted-pure text-sm">RAG-Powered · Multiple Options · Live Budget Tracker</p>
          </div>
        </div>
      </div>
      <div className="card-pure rounded-[2rem] p-8 border border-pure shadow-xl">
        {isPlanning ? <PlanningProgress progress={progress} label={progressLabel} /> : <PlannerForm onSubmit={(fd) => { formDataRef.current = fd; planTrip(fd); }} isPlanning={isPlanning} error={error} />}
      </div>
      {!isPlanning && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Sparkles, label: "AI Generated", desc: "Groq llama3-70b", color: "purple" },
            { icon: Filter, label: "Multi-Option", desc: "3-5 choices each", color: "sky" },
            { icon: Wallet, label: "Live Budget", desc: "Real-time tracking", color: "emerald" },
            { icon: Calendar, label: "Day Planner", desc: "3 time slots/day", color: "orange" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card-pure rounded-2xl p-4 border border-pure text-center">
              <div className={`w-9 h-9 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div className="font-bold text-sm text-main-pure">{label}</div>
              <div className="text-xs text-muted-pure mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
