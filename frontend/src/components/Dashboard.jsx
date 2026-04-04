"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "../store/tripStore";
import { useAuthStore } from "../store/authStore";
import {
  CloudSun,
  Route,
  Wallet,
  Clock,
  CheckCircle2,
  MapPin,
  Sparkles,
  Calendar,
  Loader2,
  Share2,
  Download,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plane,
  Train,
  Bus,
  Hotel,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

const TransportIcon = ({ mode }) => {
  const m = (mode || "").toLowerCase();
  if (m === "flight") return <Plane className="w-5 h-5" />;
  if (m === "train") return <Train className="w-5 h-5" />;
  if (m === "bus") return <Bus className="w-5 h-5" />;
  return <Route className="w-5 h-5" />;
};

export default function Dashboard() {
  const router = useRouter();
  const { tripData, isLoading: isTripLoading, error } = useTripStore();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [loadingStep, setLoadingStep] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (isTripLoading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 6 ? prev + 1 : prev));
      }, 1200);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [isTripLoading]);

  const userFirstName = useMemo(() => {
    return user?.full_name?.split(" ")[0] || "Explorer";
  }, [user]);

  if (!isHydrated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
          <div className="absolute inset-0 blur-xl bg-accent-soft animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  if (isTripLoading) {
    const steps = [
      "🧠 Awakening AI Orchestrator...",
      "🎯 Intent Agent analyzing request...",
      "📍 Destination Agent mapping context...",
      "✈️ Transport Agent finding best routes...",
      "🏨 Stay Agent searching accommodations...",
      "💸 Budget Agent optimizing costs...",
      "🗓️ Itinerary Agent crafting your plan...",
    ];
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <div className="card-pure w-full max-w-lg p-10 rounded-[40px] shadow-2xl text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-accent-primary rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 animate-bounce">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl font-black text-main-pure mb-8 tracking-tighter">Synthesizing...</h3>
          <div className="space-y-4 text-left max-w-sm mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-4 transition-all duration-500">
                {loadingStep > index ? (
                  <div className="bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                ) : loadingStep === index ? (
                  <div className="p-1"><Loader2 className="w-5 h-5 text-accent-primary animate-spin" /></div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-pure opacity-30" />
                )}
                <span className={`text-sm font-bold tracking-tight ${loadingStep >= index ? "text-main-pure" : "text-muted-pure"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tripData && isAuthenticated) {
    return (
      <div className="mt-12 p-12 rounded-[48px] bg-gradient-to-br from-indigo-600 to-violet-800 dark:from-slate-900 dark:to-slate-950 text-white shadow-2xl relative overflow-hidden group transition-all duration-700">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-white/10">
            <TrendingUp className="w-3 h-3 text-indigo-200" /> Intelligence Dashboard
          </div>
          <h2 className="text-6xl font-black mb-6 tracking-tighter leading-none uppercase">
            Hi, {userFirstName}<span className="text-indigo-300">.</span>
          </h2>
          <p className="text-indigo-100/80 text-xl font-medium mb-10 leading-relaxed max-w-lg">
            Our multi-agent system is idle. Deploy an agent team to start planning your next journey.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new Event('open-trip-sidebar'))}
            className="group flex items-center gap-4 px-10 py-5 bg-white text-indigo-700 font-black rounded-2xl shadow-xl hover:bg-indigo-50 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            COMMENCE PLANNING <ArrowRight className="group-hover:translate-x-2 transition-transform w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pb-20 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 bg-accent-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent-soft">
               Agent Confirmed
            </span>
            <button className="text-muted-pure hover:text-accent-primary transition-colors text-xs font-bold flex items-center gap-2 bg-pure px-4 py-1.5 rounded-xl border-pure shadow-sm">
              <RefreshCw className="w-3 h-3" /> Re-sync High-Speed Sync
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-8xl md:text-9xl font-black text-main-pure tracking-tighter leading-[0.75] lowercase overflow-hidden">
                {tripData?.destination}
            </h1>
            <span className="text-8xl md:text-9xl font-black text-accent-primary leading-[0.75] tracking-tighter">.</span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-pure border-2 border-pure rounded-[24px] text-main-pure font-black hover:border-accent-primary transition-all shadow-xl group text-[10px] tracking-widest uppercase">
            <Download size={22} className="group-hover:translate-y-0.5 transition-transform" /> Export Data
          </button>
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-accent-primary text-white rounded-[24px] font-black hover:bg-accent-hover transition-all shadow-2xl shadow-accent-soft text-[10px] tracking-widest uppercase">
            <Share2 size={22} /> Broadcast
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Climate</p>
          <p className="text-3xl font-black text-slate-900">{tripData?.weather?.temp}</p>
          <p className="text-xs font-bold text-sky-500 mt-1 flex items-center gap-1">
            <CloudSun className="w-3 h-3" /> {tripData?.weather?.condition}
          </p>
        </div>
        <div className={`bg-white p-6 rounded-3xl border shadow-sm ${withinBudget ? "border-slate-100" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Est. Cost</p>
          <p className="text-3xl font-black text-slate-900">{tripData?.budget?.total}</p>
          <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${withinBudget ? "text-emerald-500" : "text-amber-600"}`}>
            {withinBudget ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {withinBudget ? "Within Budget" : "Over Budget"}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration</p>
          <p className="text-3xl font-black text-slate-900">{tripData?.route?.duration}</p>
          <p className="text-xs font-bold text-indigo-500 mt-1 flex items-center gap-1 capitalize">
            <TransportIcon mode={tripData?.route?.mode} /> {tripData?.route?.mode}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itinerary</p>
          <p className="text-3xl font-black text-slate-900">{tripData?.itinerary?.length || 0}</p>
          <p className="text-xs font-bold text-purple-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Days Planned
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Budget Breakdown + Destination Info */}
        <div className="lg:col-span-4 space-y-6">

          {/* Budget Breakdown */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><Wallet className="w-5 h-5 text-indigo-600" /></div>
              Budget Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: "Transport", value: tripData?.budget?.estimated_transport, color: "bg-blue-500" },
                { label: "Stay", value: tripData?.budget?.estimated_stay, color: "bg-purple-500" },
                { label: "Activities", value: tripData?.budget?.allocated_activities, color: "bg-emerald-500" },
              ].map(({ label, value, color }) => {
                const total = tripData?.budget?.user_budget || 1;
                const pct = value ? Math.min(Math.round((value / total) * 100), 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>{label}</span>
                      <span>{value ? `₹${Math.round(value).toLocaleString()}` : "—"}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className={`h-2 ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Remaining</span>
                <span className={`text-base font-black ${(tripData?.budget?.remaining || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {tripData?.budget?.remaining != null ? `₹${Math.round(tripData.budget.remaining).toLocaleString()}` : "—"}
                </span>
              </div>
              {tripData?.budget?.cost_per_person && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Per Person</span>
                  <span className="text-base font-black text-slate-700">
                    ₹{Math.round(tripData.budget.cost_per_person).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Destination Context */}
          {(tripData?.weather?.areas?.length > 0 || tripData?.weather?.advisories?.length > 0) && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-3">
                <div className="p-2 bg-sky-50 rounded-xl"><Info className="w-5 h-5 text-sky-600" /></div>
                Destination Insights
              </h3>
              {tripData.weather.best_areas?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Best Areas to Stay</p>
                  <div className="flex flex-wrap gap-2">
                    {tripData.weather.best_areas.map((area, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">{area}</span>
                    ))}
                  </div>
                </div>
              )}
              {tripData.weather.advisories?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Travel Tips</p>
                  <ul className="space-y-1">
                    {tripData.weather.advisories.map((tip, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Itinerary */}
        <div className="lg:col-span-8 space-y-6">

          {/* Itinerary */}
          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-2xl text-white">
                  <Route className="w-6 h-6" />
                </div>
                The Pulse
              </h3>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-black text-slate-700">{tripData?.itinerary?.length || 0} Days</span>
              </div>
            </div>

            {tripData?.itinerary_summary && (
              <p className="text-slate-500 text-sm font-medium mb-8 p-4 bg-indigo-50 rounded-2xl leading-relaxed">
                {tripData.itinerary_summary}
              </p>
            )}

            <div className="space-y-4 relative">
              <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-50 rounded-full" />
              {tripData?.itinerary?.map((item, index) => {
                const isExpanded = expandedDay === index;
                return (
                  <div key={index} className="flex gap-8 group relative">
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-14 h-14 rounded-[18px] bg-white border-4 border-slate-50 flex items-center justify-center text-slate-900 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                        {item.day}
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : index)}
                        className="w-full text-left p-6 bg-slate-50/60 rounded-3xl border-2 border-transparent group-hover:border-indigo-50 group-hover:bg-white group-hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            {item.date && (
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{item.date}</p>
                            )}
                            <p className="text-lg font-black text-slate-900 leading-tight">{item.title}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">{item.activities?.length || 0} activities</p>
                          </div>
                          <div className="flex-shrink-0 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                        {isExpanded && item.activities?.length > 0 && (
                          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            {item.activities.map((act, ai) => (
                              <li key={ai} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 flex-shrink-0 mt-0.5">{ai + 1}</span>
                                {act}
                              </li>
                            ))}
                            {item.meals && (
                              <li className="text-xs text-amber-600 font-bold pt-1">🍽 {item.meals}</li>
                            )}
                            {item.transport_notes && (
                              <li className="text-xs text-blue-600 font-bold">🚌 {item.transport_notes}</li>
                            )}
                          </ul>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {(!tripData?.itinerary || tripData.itinerary.length === 0) && (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No itinerary data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transport Options */}
      {tripData?.transport?.length > 0 && (
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Plane className="w-6 h-6" /></div>
            Transport Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripData.transport.map((t, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-600 font-bold text-sm capitalize">
                    <TransportIcon mode={t.mode} />
                    {t.mode}
                    {t.class_type && <span className="text-xs text-slate-400">· {t.class_type}</span>}
                  </div>
                  <span className="text-lg font-black text-indigo-600">
                    ₹{Math.round(t.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                  <span>{t.departure}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{t.arrival}</span>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-bold">
                  {t.provider && <span>{t.provider}</span>}
                  {t.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m
                    </span>
                  )}
                  {t.route_number && <span>#{t.route_number}</span>}
                </div>
                {t.source_url && (
                  <a href={t.source_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 text-xs text-indigo-500 font-bold hover:underline block">
                    Book Now →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stay Options */}
      {tripData?.stay?.length > 0 && (
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Hotel className="w-6 h-6" /></div>
            Accommodation Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripData.stay.map((s, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-purple-100 hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-slate-900 text-base leading-tight">{s.name}</p>
                    {s.area && <p className="text-xs text-slate-400 font-bold mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.area}</p>}
                  </div>
                  {s.rating && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-xl">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black text-amber-700">{s.rating}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-xl font-black text-purple-600">
                    ₹{Math.round(s.price_per_night).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-bold"> /night</span>
                  {s.total_price && (
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      Total: ₹{Math.round(s.total_price).toLocaleString()}
                    </p>
                  )}
                </div>
                {s.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {s.amenities.slice(0, 4).map((a, ai) => (
                      <span key={ai} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{a}</span>
                    ))}
                    {s.amenities.length > 4 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold">+{s.amenities.length - 4} more</span>
                    )}
                  </div>
                )}
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 text-xs text-purple-500 font-bold hover:underline block">
                    View & Book →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}