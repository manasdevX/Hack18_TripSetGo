"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart, Bookmark, MessageCircle, MapPin, Calendar, Users, IndianRupee } from "lucide-react";
import { useDiscoverStore } from "../store/discoverStore";
import { useState } from "react";

export default function TripCard({ trip }) {
  const { toggleLike, toggleSave } = useDiscoverStore();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    if (isLiking) return;
    setIsLiking(true);
    await toggleLike(trip.trip_id);
    setIsLiking(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    await toggleSave(trip.trip_id);
    setIsSaving(false);
  };

  const formattedDate = trip.created_at
    ? formatDistanceToNow(new Date(trip.created_at), { addSuffix: true })
    : "";

  return (
    <Link href={`/dashboard/discover/${trip.trip_id}`} className="block group">
      <div className="card-pure overflow-hidden rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col h-full">
        
        {/* User Info & Cover Image */}
        <div className="relative h-64 overflow-hidden">
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" /> {/* Placeholder */}
          <img
            src={trip.cover_image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800"}
            alt={trip.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-white/10">
              {trip.user.profile_image ? (
                <img src={trip.user.profile_image} alt={trip.user.username} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {trip.user.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-white max-w-[100px] truncate">@{trip.user.username}</span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white hover:text-indigo-600 transition-colors"
              >
                <Bookmark className={`w-4 h-4 ${trip.is_saved ? "fill-current text-indigo-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Bottom Info in Image */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{trip.title}</h3>
            <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-indigo-400" /> {trip.destination}</span>
              <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4 text-emerald-400" /> {trip.cost_per_person?.toLocaleString() || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          
          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
            {trip.description || "A beautifully planned adventure awaits."}
          </p>

          <div className="flex flex-wrap gap-2">
            {trip.duration_days && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> {trip.duration_days} Days
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize">
              <Users className="w-3.5 h-3.5 text-indigo-500" /> {trip.group_type || "Solo"}
            </span>
            {trip.tags?.slice(0, 2).map((tag, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                #{tag}
              </span>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLike}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-500 transition-colors group/like"
              >
                <Heart className={`w-4 h-4 transition-transform group-hover/like:scale-110 ${trip.is_liked ? "fill-red-500 text-red-500" : ""}`} />
                <span className={trip.is_liked ? "text-red-500" : ""}>{trip.likes}</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-500 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>{trip.comments_count || 0}</span>
              </div>
            </div>
            {formattedDate && (
              <span className="text-xs text-slate-400 font-medium">{formattedDate}</span>
            )}
          </div>
          
        </div>
      </div>
    </Link>
  );
}
