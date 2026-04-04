"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "../../store/tripStore";
import { useAuthStore } from "../../store/authStore";
import { Map, Calendar, Users, IndianRupee, Loader2, ArrowRight, PlayCircle } from "lucide-react";

export default function MyTrips() {
  const router = useRouter();
  const { fetchMyTrips, loadTrip, activateTrip } = useTripStore();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    
    if (isAuthenticated) {
      setLoading(true);
      fetchMyTrips().then((data) => {
        setTrips(data || []);
        setLoading(false);
      });
    }
  }, [isHydrated, isAuthenticated, router, fetchMyTrips]);

  const handleViewTrip = (trip) => {
    loadTrip(trip);
    router.push("/dashboard");
  };

  const handleActivateTrip = async (e, trip) => {
    e.stopPropagation(); // Prevent triggering view trip
    const success = await activateTrip(trip.id);
    if (success) {
      // Load the trip and then go to dashboard since it's active now
      trip.status = "active";
      loadTrip(trip);
      router.push("/dashboard");
    } else {
      alert("Failed to activate trip");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (!isHydrated || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 lg:p-8 font-sans">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">My <span className="text-indigo-600">Journeys</span></h1>
        <p className="text-slate-500 mt-2 font-medium">Manage your planned and active trips</p>
      </div>

      {trips.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 rounded-3xl border border-slate-100">
          <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No trips planned yet</h3>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition"
          >
            Plan a New Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div 
              key={trip.id} 
              onClick={() => handleViewTrip(trip)}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-indigo-100/20 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{trip.source} to</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{trip.destination}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                    ${trip.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      trip.status === 'completed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                      'bg-amber-50 text-amber-600 border-amber-100'}
                  `}>
                    {trip.status}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold">{formatDate(trip.start_date)} - {formatDate(trip.return_date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold">₹{trip.budget.toLocaleString()} Limit</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Users className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-bold">{trip.travellers} Explorer(s)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-auto">
                <button 
                  className="flex-1 flex justify-center items-center gap-2 py-3 bg-slate-50 text-slate-700 font-bold rounded-2xl group-hover:bg-indigo-50 transition"
                >
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
                {trip.status === 'planned' && (
                  <button 
                    onClick={(e) => handleActivateTrip(e, trip)}
                    className="flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition"
                  >
                    Start <PlayCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
