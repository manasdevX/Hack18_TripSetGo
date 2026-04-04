"use client";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, Trophy, TrendingUp, MapPin, Brain, Globe,
  Calendar, Users, Sparkles, ChevronRight,
} from "lucide-react";
import { useTripStore } from "../../../store/tripStore";

// ─── HELPERS ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${Math.round(n).toLocaleString()}`;

const fmtFull = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function filterByRange(trips, range) {
  if (range === "all") return trips;
  const now = new Date();
  const cutoff = new Date();
  if (range === "30d") cutoff.setDate(now.getDate() - 30);
  else if (range === "90d") cutoff.setDate(now.getDate() - 90);
  else if (range === "ytd") cutoff.setFullYear(now.getFullYear(), 0, 1);
  return trips.filter((t) => {
    const d = t.start_date ? new Date(t.start_date) : null;
    return d && d >= cutoff;
  });
}

function computeMonthlySpend(trips) {
  const map = {};
  trips.forEach((t) => {
    if (!t.start_date || !t.budget) return;
    const d = new Date(t.start_date);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    map[key] = (map[key] || 0) + Number(t.budget);
  });
  return Object.entries(map)
    .sort(([a], [b]) => new Date("1 " + a) - new Date("1 " + b))
    .slice(-8)
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }));
}

const CHART_COLORS = ["#818CF8", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-pure p-4 rounded-2xl border border-pure shadow-xl text-sm">
      <p className="font-black text-main-pure mb-1">{label}</p>
      <p className="text-[var(--accent-primary)] font-bold">{fmtFull(payload[0]?.value)}</p>
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm hover:-translate-y-2 transition-all duration-500 group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-[var(--accent-soft)] text-[var(--accent-primary)] rounded-[20px] flex items-center justify-center group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-all duration-500">
          <Icon className="w-7 h-7" />
        </div>
        {trend && (
          <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl uppercase tracking-wide">
            {trend}
          </span>
        )}
      </div>
      <p className="text-muted-pure font-black text-[10px] uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-4xl font-black text-main-pure tracking-tighter leading-none">{value}</h2>
      {sub && <p className="text-xs font-bold text-muted-pure mt-2">{sub}</p>}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { trips, fetchMyTrips, tripsLoaded } = useTripStore();
  const [range, setRange] = useState("all");

  useEffect(() => {
    fetchMyTrips();
  }, []);

  const filtered = useMemo(() => filterByRange(trips, range), [trips, range]);

  const totalBudget = useMemo(() =>
    filtered.reduce((s, t) => s + (Number(t.budget) || 0), 0), [filtered]);

  const completedTrips = useMemo(() =>
    filtered.filter((t) => t.status === "completed"), [filtered]);

  const avgCost = useMemo(() =>
    filtered.length ? Math.round(totalBudget / filtered.length) : 0, [totalBudget, filtered]);

  const biggestTrip = useMemo(() =>
    filtered.reduce((max, t) => (Number(t.budget) > Number(max?.budget || 0) ? t : max), null),
    [filtered]);

  const monthlyData = useMemo(() => computeMonthlySpend(filtered), [filtered]);

  const topDestinations = useMemo(() => {
    const map = filtered.reduce((acc, t) => {
      if (!t.destination) return acc;
      acc[t.destination] = (acc[t.destination] || 0) + (Number(t.budget) || 0);
      return acc;
    }, {});
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [filtered]);

  // Category pie: from trip data if available, else estimate from budget splits
  const categoryData = useMemo(() => {
    let transport = 0, stay = 0, activities = 0, misc = 0;
    filtered.forEach((t) => {
      const b = t.trip_data?.budget || t.plan?.budget || {};
      transport += Number(b.transport || b.allocated_transport || 0);
      stay += Number(b.accommodation || b.allocated_stay || 0);
      activities += Number(b.activities || b.allocated_activities || 0);
      misc += Number(b.miscellaneous || 0);
    });
    const total = transport + stay + activities + misc;
    if (total === 0) {
      // Estimate from total budget with typical splits
      const tb = totalBudget;
      transport = tb * 0.28;
      stay = tb * 0.40;
      activities = tb * 0.22;
      misc = tb * 0.10;
    }
    return [
      { name: "Transport", value: Math.round(transport) },
      { name: "Stay", value: Math.round(stay) },
      { name: "Activities", value: Math.round(activities) },
      { name: "Misc", value: Math.round(misc) },
    ].filter((c) => c.value > 0);
  }, [filtered, totalBudget]);

  const insights = useMemo(() => [
    filtered.length > 0 && `You've planned ${filtered.length} trip${filtered.length > 1 ? "s" : ""} totalling ${fmtFull(totalBudget)}`,
    biggestTrip && `Your biggest adventure: ${biggestTrip.destination} at ${fmtFull(biggestTrip.budget)}`,
    completedTrips.length > 0 && `${completedTrips.length} journey${completedTrips.length > 1 ? "s" : ""} completed — explorer status unlocked! 🌍`,
    avgCost > 0 && `Average trip spend: ${fmtFull(avgCost)} per journey`,
    topDestinations.length > 0 && `Top destination: ${topDestinations[0][0]} — most invested adventure`,
  ].filter(Boolean), [filtered, totalBudget, biggestTrip, completedTrips, avgCost, topDestinations]);

  const RANGES = [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "ytd", label: "This Year" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="pb-20 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black text-main-pure tracking-tighter lowercase leading-none">
            Analytics<span className="text-[var(--accent-primary)]">.</span>
          </h1>
          <p className="text-muted-pure font-bold mt-3">Your travel intelligence dashboard</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2 bg-secondary-pure p-1 rounded-2xl border border-pure">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                range === value
                  ? "bg-[var(--accent-primary)] text-white shadow-lg"
                  : "text-muted-pure hover:text-main-pure"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Spent"
          value={totalBudget > 0 ? fmt(totalBudget) : "—"}
          sub={totalBudget > 0 ? fmtFull(totalBudget) : "Plan a trip to track spending"}
          icon={Wallet}
          trend={filtered.length > 0 ? `${filtered.length} trips` : undefined}
        />
        <StatCard
          label="Trips Completed"
          value={completedTrips.length}
          sub={`${filtered.length} total planned`}
          icon={Trophy}
          trend={completedTrips.length > 0 ? "🏆" : undefined}
        />
        <StatCard
          label="Avg Cost / Trip"
          value={avgCost > 0 ? fmt(avgCost) : "—"}
          sub={avgCost > 0 ? fmtFull(avgCost) + " per journey" : "No data yet"}
          icon={TrendingUp}
        />
        <StatCard
          label="Biggest Trip"
          value={biggestTrip?.destination || "—"}
          sub={biggestTrip ? fmtFull(biggestTrip.budget) : "No data yet"}
          icon={Globe}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Monthly Spend Bar Chart */}
        <div className="xl:col-span-2 card-pure p-8 rounded-[40px] border border-pure shadow-sm">
          <h3 className="text-xl font-black text-main-pure mb-2 tracking-tighter">Spend Over Time</h3>
          <p className="text-muted-pure text-xs font-bold mb-6">Monthly trip budget allocation</p>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-secondary)" }} />
                <Bar dataKey="amount" fill="var(--accent-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-10 h-10 text-muted-pure mx-auto mb-3 opacity-30" />
                <p className="text-muted-pure font-bold text-sm">No trip data for this period</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm">
          <h3 className="text-xl font-black text-main-pure mb-2 tracking-tighter">Category Split</h3>
          <p className="text-muted-pure text-xs font-bold mb-4">How your budget breaks down</p>
          {totalBudget > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="font-bold text-muted-pure">{c.name}</span>
                    </div>
                    <span className="font-black text-main-pure">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <Wallet className="w-10 h-10 text-muted-pure mx-auto mb-3 opacity-30" />
                <p className="text-muted-pure font-bold text-sm">Plan trips to see breakdown</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top Destinations */}
        <div className="card-pure p-8 rounded-[40px] border border-pure shadow-sm">
          <h3 className="text-xl font-black text-main-pure mb-6 tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-soft)] rounded-xl">
              <MapPin className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            Top Destinations
          </h3>
          {topDestinations.length === 0 ? (
            <div className="text-center py-10">
              <Globe className="w-10 h-10 text-muted-pure mx-auto mb-3 opacity-30" />
              <p className="text-muted-pure font-bold text-sm">Plan trips to build your destination map</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topDestinations.map(([dest, spend], i) => (
                <div
                  key={dest}
                  className="flex items-center gap-4 py-4 border-b border-pure last:border-0 hover:bg-secondary-pure rounded-2xl px-4 transition-colors group cursor-default"
                >
                  <span className="text-2xl font-black text-[var(--accent-primary)] w-8 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="font-black text-main-pure">{dest}</p>
                    <div className="mt-1 h-1.5 bg-secondary-pure rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((spend / topDestinations[0][1]) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-black text-muted-pure text-sm flex-shrink-0">{fmt(spend)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Neural Insights */}
        <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter">Neural Insights</h3>
              <p className="text-slate-400 text-xs font-bold">AI-computed from your travel data</p>
            </div>
          </div>

          {insights.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold text-sm">Plan a trip to unlock insights</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-indigo-400 font-black text-sm">{i + 1}</span>
                  </div>
                  <p className="text-slate-300 font-medium leading-relaxed text-sm flex-1">{insight}</p>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-indigo-400 transition-colors" />
                </li>
              ))}
            </ul>
          )}

          {filtered.length === 0 && (
            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-slate-400 text-xs font-bold text-center">
                💡 Start planning trips to unlock personalized travel intelligence
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
