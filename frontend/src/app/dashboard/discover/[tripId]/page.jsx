"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDiscoverStore } from "../../../../store/discoverStore";
import { useTripStore } from "../../../../store/tripStore";
import { 
  Heart, Bookmark, MessageCircle, MapPin, Calendar, Users, 
  IndianRupee, Share2, ArrowLeft, Clock, Info, Navigation, Activity
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function TripDetailPage() {
  const { tripId } = useParams();
  const router = useRouter();
  
  const { 
    selectedTrip, 
    fetchTripDetail, 
    isDetailLoading, 
    clearSelectedTrip,
    toggleLike,
    toggleSave,
    cloneTrip,
    comments,
    fetchComments,
    addComment,
    isCommentLoading
  } = useDiscoverStore();

  const { tripData: currentPlaningTrip } = useTripStore();

  const [commentText, setCommentText] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchTripDetail(tripId);
      fetchComments(tripId);
    }
    return () => clearSelectedTrip();
  }, [tripId]);

  if (isDetailLoading || !selectedTrip) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const trip = selectedTrip;
  const tripComments = comments[tripId] || [];

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const cloned = await cloneTrip(trip.trip_id);
      // Wait for clone, then push them to planner or my trips
      router.push(`/dashboard/trips`);
    } catch (err) {
      alert("Failed to clone trip. " + err?.message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment(trip.trip_id, commentText);
      setCommentText("");
    } catch (err) {}
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 fade-in">
      {/* 🔙 Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-semibold transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Discover
      </button>

      {/* 🌄 Hero Section */}
      <div className="relative h-[400px] md:h-[500px] w-full rounded-t-[3rem] rounded-b-xl overflow-hidden mb-8 shadow-2xl">
        <img 
          src={trip.cover_image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200"} 
          alt={trip.title} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* User Badge Top */}
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full pl-2 pr-4 py-1.5 border border-white/20">
          <Link href={`/dashboard/profile/${trip.user.username}`} className="flex items-center gap-2">
            {trip.user.profile_image ? (
              <img src={trip.user.profile_image} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                {trip.user.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white hover:text-indigo-300">@{trip.user.username}</span>
          </Link>
        </div>

        {/* Action Buttons Top Right */}
        <div className="absolute top-6 right-6 flex gap-3">
          <button className="p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white hover:text-indigo-600 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toggleSave(trip.trip_id)}
            className="p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white hover:text-indigo-600 transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${trip.is_saved ? "fill-current text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Title Content Bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-bold border border-white/30 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-300" /> {trip.destination}
            </span>
            {trip.duration_days && (
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-bold border border-white/30 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-300" /> {trip.duration_days} Days
              </span>
            )}
            <span className="px-3 py-1 bg-emerald-500/80 backdrop-blur-md rounded-lg text-white text-sm font-bold border border-white/30 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-100" /> {trip.cost_per_person?.toLocaleString()}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-2">
            {trip.title}
          </h1>
        </div>
      </div>

      {/* 🚀 Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Overview */}
          <section className="card-pure p-8 rounded-3xl">
            <h2 className="text-2xl font-black text-main-pure mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-indigo-500" /> Overview
            </h2>
            <p className="text-muted-pure leading-relaxed text-lg whitespace-pre-wrap">
              {trip.description || "No description provided."}
            </p>
            
            {trip.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {trip.tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold border border-indigo-100 dark:border-indigo-500/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Itinerary */}
          {trip.itinerary?.days?.length > 0 && (
            <section className="card-pure p-8 rounded-3xl">
              <h2 className="text-2xl font-black text-main-pure mb-6 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-indigo-500" /> Day by Day Plan
              </h2>
              <div className="space-y-6">
                {trip.itinerary.days.map((day, idx) => (
                  <div key={idx} className="relative pl-8 border-l-2 border-indigo-100 dark:border-indigo-900 pb-2 last:border-0 last:pb-0">
                    <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-indigo-500 border-4 border-[var(--bg-card)]" />
                    <h3 className="text-xl font-bold text-main-pure mb-2 flex items-center gap-2">
                      Day {day.day} <span className="text-muted-pure font-medium text-base">- {day.title}</span>
                    </h3>
                    
                    {day.activities?.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {day.activities.map((act, i) => (
                          <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-main-pure">{act.time} - {act.activity}</p>
                              {act.cost_estimate && (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                  <IndianRupee className="w-3 h-3" /> {act.cost_estimate}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Comments Section */}
          <section className="card-pure p-8 rounded-3xl">
            <h2 className="text-2xl font-black text-main-pure mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-indigo-500" />
              Comments ({trip.comments_count || 0})
            </h2>

            <form onSubmit={handleCommentSubmit} className="mb-8 flex gap-3">
              <img 
                src="https://via.placeholder.com/40" 
                alt="Me" 
                className="w-10 h-10 rounded-full object-cover bg-slate-200 shrink-0"
              />
              <div className="flex-1">
                <textarea 
                  className="input-pure w-full p-4 rounded-xl resize-none h-24 mb-2 max-h-32"
                  placeholder="Share your thoughts or ask a question..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={isCommentLoading}
                />
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isCommentLoading || !commentText.trim()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isCommentLoading ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-6">
              {tripComments.length === 0 ? (
                <p className="text-center text-muted-pure py-8 italic font-medium">No comments yet. Be the first to start the discussion!</p>
              ) : (
                tripComments.map((c) => (
                  <div key={c.id} className="flex gap-4">
                    <img 
                      src={c.user.profile_image || "https://via.placeholder.com/40"} 
                      alt={c.user.username} 
                      className="w-10 h-10 rounded-full object-cover bg-indigo-100"
                    />
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-baseline mb-1">
                        <Link href={`/dashboard/profile/${c.user.username}`} className="font-bold text-main-pure hover:text-indigo-600">
                          @{c.user.username}
                        </Link>
                        <span className="text-xs text-muted-pure font-medium">
                          {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ""}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Right Column (Sidebar Actions) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            
            {/* Clone Box */}
            <div className="card-pure p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/50 shadow-xl shadow-indigo-500/5">
              <h3 className="text-xl font-black text-main-pure mb-2 text-center">Love this trip?</h3>
              <p className="text-muted-pure text-center text-sm mb-6 font-medium">
                Make it yours! Clone this itinerary to your own planner and customize it to fit your needs perfectly.
              </p>
              
              <button 
                onClick={handleClone}
                disabled={isCloning}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all disabled:opacity-70"
              >
                {isCloning ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Activity className="w-5 h-5" /> Plan This Trip
                  </>
                )}
              </button>

              <div className="flex justify-center mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 gap-8">
                <button 
                  onClick={() => toggleLike(trip.trip_id)}
                  className="flex flex-col items-center gap-1 group/like"
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full group-hover/like:bg-red-50 dark:group-hover/like:bg-red-500/10 transition-colors">
                    <Heart className={`w-6 h-6 ${trip.is_liked ? "fill-red-500 text-red-500" : "text-slate-400 group-hover/like:text-red-500"}`} />
                  </div>
                  <span className={`text-sm font-bold ${trip.is_liked ? "text-red-500" : "text-slate-500"}`}>{trip.likes} Likes</span>
                </button>
                
                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full">
                    <MessageCircle className="w-6 h-6 text-slate-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-500">{trip.comments_count || 0} Comments</span>
                </div>
              </div>
            </div>

            {/* Budget Summary Mini-Card */}
            {trip.budget_summary && (
              <div className="card-pure p-6 rounded-3xl">
                <h3 className="text-lg font-black text-main-pure mb-4 flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-indigo-500" /> Budget Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-pure font-medium">Est. Transport</span>
                    <span className="font-bold text-main-pure">₹{trip.budget_summary.estimated_transport_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-pure font-medium">Est. Stay</span>
                    <span className="font-bold text-main-pure">₹{trip.budget_summary.estimated_stay_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pt-4">
                    <span className="font-black text-main-pure">Total Est. Cost</span>
                    <span className="font-black text-emerald-500 text-xl">₹{trip.budget_summary.total_estimated_cost?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
