"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTripStore } from "../../../../store/tripStore";
import {
  ArrowLeft, MapPin, Calendar, Wallet, Users, Compass, Plane, Train, Bus, Car,
  Hotel, Star, Clock, Sparkles, Navigation, Utensils, IndianRupee, 
  Map, CheckCircle2, ShieldCheck, Heart, Share2, Printer, MoreHorizontal,
  CloudRain, Coffee, Camera, Trash2, Edit3, Globe
} from "lucide-react";

// --- HELPERS ---
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const TRANSPORT_ICON = { Flight: Plane, Train, Bus, Car };

const VIBE_GRADIENT = {
  beach: "from-cyan-500 to-blue-600",
  mountain: "from-emerald-600 to-teal-800",
  city: "from-indigo-600 to-purple-700",
  heritage: "from-amber-500 to-orange-600",
  luxury: "from-purple-600 to-pink-600",
};

const SLOT_ICONS = { morning: "🌅", afternoon: "☀️", evening: "🌆" };

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id;
  const { fetchTripById, deleteTrip, isLoading, error } = useTripStore();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId).then(setTrip).catch(console.error);
    }
  }, [tripId, fetchTripById]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-pure font-bold animate-pulse text-lg">Retrieving your journey...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
          <MapPin className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-black text-main-pure mb-2">Trip Not Found</h2>
          <p className="text-muted-pure mb-8">{error || "The itinerary you're looking for doesn't exist or you don't have access."}</p>
          <Link href="/dashboard/trips" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all inline-block shadow-lg shadow-indigo-200">
            Back to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const transport = trip.transport || {};
  const hotel = trip.stay || {};
  const budget = trip.budget_summary || {};
  const itinerary = trip.itinerary || { days: [] };
  const selectedActs = itinerary.selected_activities || {};

  const TIcon = TRANSPORT_ICON[transport.mode] || Plane;

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      try {
        await deleteTrip(trip.id);
        router.push("/dashboard/trips");
      } catch (err) {
        alert("Failed to delete trip");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-fade-in">
      {/* Top Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/trips" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-all group">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600">
            <ArrowLeft className="w-5 h-5" />
          </div>
          Back to My Journeys
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-pure hover:border-indigo-200 transition-all text-slate-500 hover:text-indigo-600 shadow-sm">
            <Printer className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-pure hover:border-indigo-200 transition-all text-slate-500 hover:text-indigo-600 shadow-sm">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-red-100 hover:border-red-500 transition-all text-slate-500 hover:text-red-600 shadow-sm">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 text-white p-10 mb-10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-800/40" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  Confirmed Itinerary
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Booking Ready
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight">{trip.destination}</h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-300 font-bold">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-400" /> {trip.source} → {trip.destination}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> {trip.start_date || "TBD"} - {trip.end_date || "TBD"}</div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> {trip.num_travelers} Travelers</div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 w-full md:w-auto min-w-[240px]">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1 text-center">Estimated Total Cost</p>
              <h2 className="text-4xl font-black text-center">{fmt(budget.total_cost || trip.budget)}</h2>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-4">
                 <div className="h-full bg-indigo-400 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {trip.tags?.map(t => (
              <span key={t} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 transition rounded-xl text-xs font-bold capitalize border border-white/5">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Itinerary Content */}
        <div className="lg:col-span-8 space-y-10">
          {/* Booking Cards (Transport & Stay) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transport Card */}
            <div className="card-pure p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-sky-100 dark:bg-sky-900/40 rounded-2xl text-sky-600">
                  <TIcon className="w-6 h-6" />
                </div>
                {transport.price && <div className="text-right font-black text-main-pure">{fmt(transport.price)}</div>}
              </div>
              <h3 className="text-xl font-black text-main-pure mb-1">Transport Details</h3>
              <p className="text-sm font-bold text-sky-600 uppercase mb-4 tracking-tighter">{transport.mode || "Flight"} · {transport.provider || "Standard"}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-muted-pure">Provider</span>
                  <span className="font-bold text-main-pure">{transport.provider || "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-muted-pure">Comfort Level</span>
                  <span className="font-bold text-main-pure flex items-center gap-1">{transport.comfort || 4}/5 <Star className="w-3 h-3 text-yellow-400 fill-current" /></span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-muted-pure">Duration</span>
                  <span className="font-bold text-main-pure">{transport.duration || "N/A"}</span>
                </div>
              </div>
              <button className="w-full mt-6 py-3 bg-sky-50 dark:bg-sky-900/20 text-sky-600 font-bold rounded-2xl hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 text-sm">
                 <Compass className="w-4 h-4" /> View Route Details
              </button>
            </div>

            {/* Stay Card */}
            <div className="card-pure p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 group hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600">
                  <Hotel className="w-6 h-6" />
                </div>
                <div className="text-right font-black text-main-pure">{fmt(hotel.price_per_night || 0)} <span className="text-[10px] text-muted-pure block">per night</span></div>
              </div>
              <h3 className="text-xl font-black text-main-pure mb-1">Accommodation</h3>
              <p className="text-sm font-bold text-emerald-600 uppercase mb-4 tracking-tighter">{hotel.tier || "Boutique"} · {hotel.location || trip.destination}</p>
              
              <h4 className="font-bold text-main-pure mb-2 line-clamp-1">{hotel.name || "Premium Stay"}</h4>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {hotel.amenities?.slice(0, 3).map(a => (
                  <span key={a} className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                    {a}
                  </span>
                )) || <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-2.5 py-1 rounded-lg">All Facilities Included</span>}
              </div>
              <button className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-sm">
                 <Map className="w-4 h-4" /> View on Local Map
              </button>
            </div>
          </div>

          {/* Timeline Section */}
          <section className="card-pure p-10 rounded-[3rem] shadow-xl border border-slate-50 dark:border-slate-800">
             <div className="flex items-center justify-between mb-12">
               <h2 className="text-3xl font-black text-main-pure flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl">
                    <Clock className="w-6 h-6 text-indigo-600" />
                  </div>
                  Daily Itinerary
               </h2>
               <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {Object.keys(selectedActs).length} Selections Verified
               </div>
             </div>

             <div className="space-y-16">
               {itinerary.days?.map((day, idx) => (
                 <div key={idx} className="relative">
                    {/* Timeline Line */}
                    {idx !== itinerary.days.length - 1 && (
                      <div className="absolute left-[27px] top-[70px] bottom-[-64px] w-1 bg-gradient-to-b from-indigo-500/20 via-indigo-500/5 to-transparent" />
                    )}

                    {/* Day Marker */}
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-500/20 z-10 border-4 border-white dark:border-slate-900">
                        {day.day}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-main-pure">{day.day_summary || day.title}</h3>
                        <p className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em]">{day.date || `The Adventure Begins`}</p>
                      </div>
                    </div>

                    <div className="ml-20 space-y-8">
                       {["morning", "afternoon", "evening"].map((slot) => {
                          const slotKey = `d${day.day}_${slot}`;
                          const selection = selectedActs[slotKey];
                          
                          if (!selection) return null;

                          return (
                            <div key={slot} className="group">
                               <div className="flex items-start gap-6">
                                  <div className="flex flex-col items-center gap-3 pt-1">
                                     <div className="text-2xl drop-shadow-sm">{SLOT_ICONS[slot]}</div>
                                     <div className="w-0.5 h-12 bg-slate-100 dark:bg-slate-800" />
                                  </div>

                                  <div className="flex-1 bg-white dark:bg-slate-900/60 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/40 transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/5 hover:-translate-y-1">
                                     <div className="flex justify-between items-start mb-3">
                                        <div>
                                           <div className="flex items-center gap-2 mb-1.5">
                                              <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${slot === 'morning' ? 'bg-amber-100 text-amber-600' : slot === 'afternoon' ? 'bg-sky-100 text-sky-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                 {slot}
                                              </div>
                                              <span className="text-xs font-bold text-slate-400">{day[slot]?.time || (slot === 'morning' ? '08:00 AM' : slot === 'afternoon' ? '01:00 PM' : '07:00 PM')}</span>
                                           </div>
                                           <h4 className="text-lg font-black text-main-pure">{selection.name || selection.activity}</h4>
                                        </div>
                                        {selection.cost > 0 && (
                                           <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black px-3 py-1.5 rounded-xl text-xs border border-emerald-100 dark:border-emerald-900/30">
                                              {fmt(selection.cost)}
                                           </div>
                                        )}
                                     </div>
                                     <p className="text-sm text-muted-pure leading-relaxed mb-4">
                                        {selection.description || "Enjoy your customized activity planned by TripSetGo AI."}
                                     </p>
                                     <div className="flex flex-wrap gap-2">
                                        {selection.tags?.map(tag => (
                                           <span key={tag} className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800">#{tag}</span>
                                        ))}
                                        {selection.duration && (
                                           <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1 ml-auto">
                                              <Clock className="w-3 h-3" /> {selection.duration}
                                           </span>
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
               ))}
             </div>
          </section>
        </div>

        {/* Sidebar: Budget, Insights & Actions */}
        <div className="lg:col-span-4 space-y-6">
           {/* Budget Breakdown */}
           <div className="card-pure p-8 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-slate-800">
              <h3 className="text-xl font-black text-main-pure mb-6 flex items-center gap-2">
                 <Wallet className="w-5 h-5 text-emerald-500" /> Budget Summary
              </h3>
              
              <div className="space-y-5">
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-pure font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-default"><Plane className="w-4 h-4 text-sky-400" /> Transport</span>
                    <span className="font-black text-main-pure">{fmt(budget.transport_cost || transport.total_cost || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-pure font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-default"><Hotel className="w-4 h-4 text-emerald-400" /> Accommodation</span>
                    <span className="font-black text-main-pure">{fmt(budget.stay_cost || hotel.total_stay_cost || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-pure font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-default"><Utensils className="w-4 h-4 text-orange-400" /> Food Plan</span>
                    <span className="font-black text-main-pure">{fmt(budget.selected_food?.total_cost || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-pure font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-default"><Sparkles className="w-4 h-4 text-purple-400" /> Activities</span>
                    <span className="font-black text-main-pure">{fmt(budget.total_cost - (budget.transport_cost || 0) - (budget.stay_cost || 0) || 0)}</span>
                 </div>
                 
                 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Spent</span>
                       <span className="text-2xl font-black text-main-pure">{fmt(budget.total_cost || trip.budget)}</span>
                    </div>
                    {budget.remaining >= 0 && (
                       <p className="text-[10px] font-bold text-emerald-600 text-right">✓ ₹{budget.remaining.toLocaleString()} within budget</p>
                    )}
                 </div>
              </div>
           </div>

           {/* Travel Tip / Insight */}
           <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <Compass className="w-10 h-10 text-indigo-200 mb-6" />
              <h4 className="text-xl font-black mb-3 text-indigo-50">Local Insight for {trip.destination}</h4>
              <p className="text-indigo-100/90 text-sm leading-relaxed mb-6">
                "Based on your travel dates in {new Date(trip.start_date).toLocaleString('default', { month: 'long' })}, we recommend visiting the local heritage sites early morning to avoid the tourist rush."
              </p>
              <button className="w-full py-3 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg text-sm">
                 Explore New Local Spots
              </button>
           </div>

           {/* Quick Stats */}
           <div className="card-pure p-6 rounded-[2rem] border border-pure flex items-center justify-around">
              <div className="text-center">
                 <div className="text-lg font-black text-main-pure">{trip.duration_days}</div>
                 <div className="text-[10px] font-bold text-muted-pure uppercase">Days</div>
              </div>
              <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
              <div className="text-center">
                 <div className="text-lg font-black text-main-pure">{trip.num_travelers}</div>
                 <div className="text-[10px] font-bold text-muted-pure uppercase">Guests</div>
              </div>
              <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
              <div className="text-center">
                 <div className="text-lg font-black text-main-pure">{Object.keys(selectedActs).length}</div>
                 <div className="text-[10px] font-bold text-muted-pure uppercase">Activites</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
