"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import TripCard from "../../../../components/TripCard";
import { ArrowLeft, UserPlus, UserCheck, Map, Users } from "lucide-react";

export default function UserProfilePage() {
  const { username } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/users/${username}/profile`);
      setProfile(res.data.user);
      setTrips(res.data.trips);
      setIsFollowing(res.data.user.is_following);
      setFollowers(res.data.user.followers_count);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    // Optimistic
    setIsFollowing(!isFollowing);
    setFollowers((prev) => (isFollowing ? prev - 1 : prev + 1));
    try {
      await api.post(`/users/${username}/follow`);
    } catch {
      // Revert
      setIsFollowing(!isFollowing);
      setFollowers((prev) => (isFollowing ? prev + 1 : prev - 1));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-main-pure mb-4">Profile Not Found</h2>
        <p className="text-muted-pure mb-8">{error}</p>
        <button onClick={() => router.back()} className="text-indigo-600 font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 fade-in">
      {/* 🔙 Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-semibold transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      {/* 🌟 Profile Header */}
      <div className="card-pure p-8 md:p-12 rounded-[2.5rem] mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-[80px] -z-10" />
        
        {/* Avatar */}
        <div className="shrink-0 relative">
          {profile.profile_image ? (
            <img src={profile.profile_image} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-2xl" />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-5xl font-black border-4 border-white dark:border-slate-800 shadow-2xl">
              {profile.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-main-pure mb-2 flex items-center justify-center md:justify-start gap-3">
            {profile.full_name || profile.username}
          </h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold mb-4">@{profile.username}</p>
          
          <p className="text-muted-pure text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed mb-6">
            {profile.bio || "This user hasn't added a bio yet but they clearly love to travel!"}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-2xl font-black text-main-pure flex items-center gap-2">
                <Map className="w-5 h-5 text-indigo-500" /> {trips.length}
              </span>
              <span className="text-sm font-semibold text-muted-pure uppercase tracking-wider">Trips</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center md:items-start">
              <span className="text-2xl font-black text-main-pure flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> {followers}
              </span>
              <span className="text-sm font-semibold text-muted-pure uppercase tracking-wider">Followers</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center md:items-start">
              <span className="text-2xl font-black text-main-pure">
                {profile.following_count}
              </span>
              <span className="text-sm font-semibold text-muted-pure uppercase tracking-wider">Following</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 mt-4 md:mt-0">
          <button 
            onClick={handleFollow}
            className={`px-8 py-4 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg ${
              isFollowing 
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 hover:-translate-y-1"
            }`}
          >
            {isFollowing ? (
              <><UserCheck className="w-5 h-5" /> Following</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Follow</>
            )}
          </button>
        </div>
      </div>

      {/* 🧭 User's Trips */}
      <div>
        <h2 className="text-2xl font-black text-main-pure mb-8 flex items-center gap-3">
          <Map className="w-6 h-6 text-indigo-600" /> Trips by {profile.username}
        </h2>

        {trips.length === 0 ? (
          <div className="text-center py-20 card-pure rounded-[2.5rem] border-dashed border-2">
             <Map className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
             <p className="text-lg font-bold text-slate-500 dark:text-slate-400">No public trips yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.trip_id} trip={trip} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
