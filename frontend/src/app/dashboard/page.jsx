"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { useTripStore } from "../../store/tripStore";
import api from "../../lib/api";
import {
  Compass,
  MapPin,
  ArrowRight,
  Plane,
  Camera,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Map,
  Activity,
  MoreHorizontal,
  CalendarDays,
  Coffee,
  Ticket,
} from "lucide-react";

// --- HELPERS ---
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

// --- SKELETONS ---
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl ${className}`} />
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 animate-in fade-in pb-24">
      <Skeleton className="w-full h-80 rounded-[48px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Skeleton className="h-40 rounded-[48px]" />
        <Skeleton className="h-40 rounded-[48px]" />
        <Skeleton className="h-40 rounded-[48px]" />
        <Skeleton className="h-40 rounded-[48px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-[48px]" />
        <Skeleton className="h-96 rounded-[48px]" />
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function DashboardOverview() {
  const { user } = useAuthStore();
  const { trips, fetchMyTrips, tripsLoaded, isLoading: isTripsLoading } = useTripStore();
  
  const [financials, setFinancials] = useState({ spent: 0, balance: 0 });
  const [isFinLoading, setIsFinLoading] = useState(true);

  // 1. Fetch Trips
  useEffect(() => {
    fetchMyTrips();
  }, [fetchMyTrips]);

  // 2. Fetch SplitCosts (Financials) Local Aggregation
  useEffect(() => {
    const fetchFinData = async () => {
      try {
        const res = await api.get("/groups");
        const groups = res.data?.groups || res.data || [];
        
        let totalSpent = 0;
        const balances = {};
        const currentUserId = user?.id;

        // Initialize user balance
        balances[currentUserId] = 0;

        groups.forEach((g) => {
          // Identify current user's member ID in this group
          const cuMemberId = g.members?.find((m) => m.user_id === currentUserId)?.id;
          if (!cuMemberId) return;

          // Track total spent
          const groupExp = Array.isArray(g.expenses) ? g.expenses : [];
          groupExp.forEach((e) => {
            const amount = parseFloat(e.amount) || 0;
            const paidBy = e.paidBy || e.paid_by;
            const splits = e.splits || {};

            // If user paid, their balance goes up (creditor)
            if (paidBy === cuMemberId) {
              balances[currentUserId] += amount;
            }

            // Deduct user's split share (debt)
            if (splits[cuMemberId] !== undefined) {
              const myShare = parseFloat(splits[cuMemberId]);
              balances[currentUserId] -= myShare;
              totalSpent += myShare; // Total spent across all trips
            }
          });

          // Adjust for settlements
          const groupSettles = Array.isArray(g.settlements) ? g.settlements : [];
          groupSettles.forEach((s) => {
            const amt = parseFloat(s.amount) || 0;
            const fromM = s.from_member || s.from;
            const toM = s.to_member || s.to;

            if (fromM === cuMemberId) balances[currentUserId] += amt;
            if (toM === cuMemberId) balances[currentUserId] -= amt;
          });
        });

        setFinancials({
          spent: totalSpent,
          balance: balances[currentUserId] || 0,
        });
      } catch (err) {
        console.error("Failed to fetch financials:", err);
      } finally {
        setIsFinLoading(false);
      }
    };

    if (user?.id) fetchFinData();
  }, [user]);

  // Compute metrics
  const uniqueCountries = useMemo(() => {
    const dests = trips.map((t) => t.destination).filter(Boolean);
    return [...new Set(dests)].length;
  }, [trips]);

  const activeTrip = useMemo(() => {
    return trips.find((t) => t.status === "ongoing" || t.status === "active");
  }, [trips]);

  const upcomingAgenda = useMemo(() => {
    if (!activeTrip || !activeTrip.itinerary || !activeTrip.itinerary.days) return [];
    // Just grab the first two days as a "preview" for agenda timeline
    const days = activeTrip.itinerary.days || [];
    return days.slice(0, 2);
  }, [activeTrip]);

  // Loading state
  const isGlobalLoading = !tripsLoaded || isFinLoading;
  if (isGlobalLoading) return <PageSkeleton />;

  return (
    <div className="max-w-[1400px] mx-auto w-full p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* --- GRID TOP ROW: Hero --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="md:col-span-3 lg:col-span-4 card-pure rounded-[48px] border border-pure overflow-hidden relative shadow-sm hover:shadow-xl transition-all duration-500 min-h-[340px] flex items-center p-8 md:p-14 group">
          {/* Animated Background Gradients & Noise inside the card */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/20 to-transparent opacity-80" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-main-pure tracking-tighter mb-4 leading-[1.1]">
              Good Morning, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                {user?.full_name?.split(" ")[0] || "Traveler"}!
              </span> ✈️
            </h1>
            <p className="text-muted-pure font-bold text-lg md:text-xl mb-10 tracking-tight max-w-lg">
              Your global command center is active. Monitor your itineraries, shared finances, and next adventures.
            </p>
            <Link
              href="/dashboard/planner"
              className="inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10"
            >
              <Compass className="w-5 h-5" /> Let's Plan a New Trip
            </Link>
          </div>
        </div>
      </div>

      {/* --- GRID SECOND ROW: High Density Bento --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Trip Snapshot (Col Span 8) */}
        <div className="lg:col-span-8 card-pure border border-pure rounded-[48px] p-8 md:p-12 hover:scale-[1.01] transition-all duration-300 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest">
                <Activity className="w-4 h-4 animate-pulse" /> Ongoing Journey
              </div>
              {activeTrip && (
                 <Link href={`/dashboard/trips/${activeTrip.id}`} className="text-muted-pure hover:text-[var(--accent-primary)] transition-colors">
                   <MoreHorizontal className="w-6 h-6" />
                 </Link>
              )}
            </div>

            {activeTrip ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-main-pure mb-2">
                    {activeTrip.destination}
                  </h2>
                  <div className="flex items-center gap-4 text-muted-pure font-bold">
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {activeTrip.duration_days} Days</span>
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {activeTrip.num_travelers} pax</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> from {activeTrip.source}</span>
                  </div>
                </div>

                {/* Mini Preview Segment */}
                {upcomingAgenda.length > 0 && (
                  <div className="bg-secondary-pure rounded-[32px] p-6 mt-8 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-16 h-16 rounded-[24px] bg-white dark:bg-slate-800 shadow-sm flex flex-col items-center justify-center flex-shrink-0">
                       <span className="text-xs font-black tracking-widest uppercase text-muted-pure">Day</span>
                       <span className="text-2xl font-black text-main-pure">{upcomingAgenda[0].day_number || 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-main-pure text-lg line-clamp-1">{upcomingAgenda[0].notes || "Exploring highlights"}</p>
                      <p className="text-muted-pure font-bold text-sm mt-1 line-clamp-2">
                        {upcomingAgenda[0].activities?.[0]?.task || "Sightseeing and leisure."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-70">
                 <Map className="w-16 h-16 text-muted-pure mb-4 stroke-[1.5]" />
                 <h3 className="text-xl font-black text-main-pure">No Active Trips</h3>
                 <p className="text-muted-pure font-bold mt-2">Saved and past trips are in your My Trips vault.</p>
               </div>
            )}
          </div>
          
          <div className="mt-8">
            <button disabled={!activeTrip} className="w-full md:w-auto px-8 py-4 rounded-[24px] bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3">
              <MapPin className="w-5 h-5" /> View Live Map
            </button>
          </div>
        </div>

        {/* Vertical Quick Stats (Col Span 4) */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-6">
           <StatCard 
             title="Total Trips" 
             val={trips.length} 
             icon={<Plane />} 
             color="indigo" 
           />
           <StatCard 
             title="Countries" 
             val={uniqueCountries} 
             icon={<Compass />} 
             color="emerald" 
           />
           <StatCard 
             title="Total Spent" 
             val={fmt(financials.spent)} 
             icon={<Wallet />} 
             color="amber" 
           />
           <StatCard 
             title="My Position" 
             val={financials.balance >= 0 ? `+${fmt(financials.balance)}` : `-${fmt(Math.abs(financials.balance))}`} 
             icon={financials.balance >= 0 ? <TrendingUp /> : <TrendingDown />} 
             color={financials.balance >= 0 ? "emerald" : "rose"} 
             subtitle={financials.balance >= 0 ? "You are owed" : "You owe details"}
           />
        </div>
      </div>

      {/* --- GRID THIRD ROW: Agenda & Analytics --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Upcoming Agenda (Col span 5) */}
        <div className="lg:col-span-5 card-pure border border-pure rounded-[48px] p-8 md:p-12 hover:scale-[1.01] transition-all shadow-sm">
           <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center">
               <CalendarDays className="w-5 h-5" />
             </div>
             <h3 className="text-2xl font-black text-main-pure tracking-tighter">Upcoming Agenda</h3>
           </div>
           
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-500/20 before:via-rose-500/20 before:to-transparent">
             {upcomingAgenda.length > 0 ? (
               upcomingAgenda.map((day, idx) => (
                 <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 card-pure border-rose-500 bg-rose-50/50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 text-rose-600 font-black text-xs">
                       D{day.day_number || idx + 1}
                    </div>
                    <div className="card-pure border border-pure rounded-3xl p-5 shadow-sm w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-4 md:ml-0 hover:shadow-md transition-shadow">
                       <h4 className="font-black text-main-pure mb-1 line-clamp-1">{day.notes || `Day ${day.day_number}`}</h4>
                       <p className="text-xs text-muted-pure font-bold line-clamp-2">
                         {day.activities?.[0]?.task || "Start your exciting journey."}
                       </p>
                    </div>
                 </div>
               ))
             ) : (
               <div className="relative z-10 py-10 flex flex-col items-center text-center opacity-70">
                 <Coffee className="w-12 h-12 text-muted-pure mb-3" />
                 <p className="font-extrabold text-main-pure text-lg">No Immediate Plans</p>
                 <p className="text-sm font-bold text-muted-pure mt-1">Sit back and relax.</p>
               </div>
             )}
           </div>
        </div>

        {/* Analytics Preview (Col span 7) */}
        <div className="lg:col-span-7 bg-slate-900 dark:bg-[#0c101a] rounded-[48px] p-8 md:p-12 text-white overflow-hidden relative shadow-2xl hover:scale-[1.01] transition-all flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/5">
                 <BarChart3 className="w-5 h-5 text-indigo-400" />
               </div>
               <h3 className="text-2xl font-black tracking-tighter">Velocity & Scale</h3>
            </div>
            <Link href="/dashboard/analytics" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
               <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-end relative z-10 space-y-8">
            <div className="flex items-end gap-6 h-40">
               {/* Simplified Dummy/Static Bar Chart scaled relative */}
               {[40, 70, 45, 90, 60, 100].map((h, i) => (
                 <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                   <div className="w-full bg-white/10 rounded-t-xl group-hover:bg-indigo-500/80 transition-colors relative" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-md">
                        {Math.round(h * 1.5)}K
                      </div>
                   </div>
                   <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">M{i+1}</span>
                 </div>
               ))}
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h4 className="font-bold text-sm text-white/60 mb-1 tracking-widest uppercase">Travel Expend. Outlook</h4>
                  <div className="text-3xl font-black">Trending Higher <TrendingUp className="inline w-6 h-6 ml-2 text-rose-400" /></div>
               </div>
               <Link href="/dashboard/expenses" className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform text-center shadow-lg">
                 View Finances
               </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

function StatCard({ title, val, icon, color, subtitle }) {
  const colorMap = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-500",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-500",
  };

  const badgeClass = colorMap[color] || colorMap.indigo;

  return (
    <div className="card-pure border border-pure rounded-[40px] p-8 hover:scale-[1.03] transition-all shadow-sm flex flex-col justify-end min-h-[220px]">
      <div className={`w-12 h-12 rounded-[20px] mb-auto flex items-center justify-center ${badgeClass}`}>
        <div className="[&>svg]:w-6 [&>svg]:h-6">{icon}</div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-pure mb-2">{title}</p>
        <p className="text-3xl lg:text-4xl font-black text-main-pure tracking-tighter truncate">{val}</p>
        {subtitle && <p className="text-[10px] uppercase tracking-widest font-bold text-muted-pure mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
