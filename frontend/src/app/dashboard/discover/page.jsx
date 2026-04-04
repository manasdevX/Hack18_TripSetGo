"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDiscoverStore } from "../../../store/discoverStore";
import TripCard from "../../../components/TripCard";
import { Search, SlidersHorizontal, Map, Flame, MapPin, Compass } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "../../../store/authStore";

export default function DiscoverPage() {
  const { 
    trips, fetchFeed, isLoading, hasMore, error,
    searchQuery, searchTrips, searchResults, isSearching,
    trendingTrips, fetchTrending, isTrendingLoading,
    filters, setFilters
  } = useDiscoverStore();

  const { user } = useAuthStore();
  const observerTarget = useRef(null);

  // Initial fetch
  useEffect(() => {
    fetchTrending();
    fetchFeed(true); // reset and fetch
  }, []);

  // Infinite scroll — stop if loading, no more pages, error, or searching
  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoading && !searchQuery && !error) {
      fetchFeed();
    }
  }, [hasMore, isLoading, searchQuery, fetchFeed, error]);

  useEffect(() => {
    const option = { root: null, rootMargin: "20px", threshold: 0 };
    const observer = new IntersectionObserver(handleObserver, option);
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Handle Search
  const handleSearch = (e) => {
    const q = e.target.value;
    if (q) {
      searchTrips(q);
    } else {
      searchTrips("");
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ sort: e.target.value });
  };

  const displayTrips = searchQuery ? searchResults : trips;
  const showLoading = (isLoading && !error) || (isSearching);
  const isDone = !showLoading; // API has responded (success or error)

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* 🌟 Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 dark:bg-indigo-900 mb-12 p-10 md:p-16">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            Discover the World's Best Itineraries
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl font-medium mb-8">
            Explore curated trips created by the community. Clone them instantly or get inspired for your next adventure.
          </p>

          {/* Search Bar */}
          <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-2xl focus-within:bg-white/20 transition-all">
            <div className="p-3">
              <Search className="w-6 h-6 text-indigo-100" />
            </div>
            <input 
              type="text" 
              placeholder="Search by destination, vibes, or keywords..." 
              className="flex-1 bg-transparent text-white placeholder:text-indigo-200 outline-none font-medium text-lg"
              onChange={(e) => {
                // simple debounce
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(() => handleSearch(e), 500);
              }}
            />
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-sm">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Trending Section (Only show if not searching) */}
      {!searchQuery && trendingTrips.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-main-pure">Trending This Week</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingTrips.slice(0,3).map(trip => (
              <TripCard key={`trending-${trip.trip_id}`} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* 🧭 Main Feed */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
            <Compass className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-main-pure">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Community Feed"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <select 
            className="input-pure px-4 py-2.5 rounded-xl font-medium text-sm appearance-none pr-10 relative cursor-pointer"
            value={filters.sort}
            onChange={handleFilterChange}
          >
            <option value="trending">🔥 Trending</option>
            <option value="newest">✨ Newest First</option>
            <option value="popular">❤️ Most Liked</option>
            <option value="budget">💰 Lowest Budget</option>
          </select>
          <button className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayTrips.map((trip) => (
          <TripCard key={trip.trip_id} trip={trip} />
        ))}
        
        {/* Loading Skeletons */}
        {showLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`skel-${i}`} className="card-pure h-[400px] rounded-3xl animate-pulse flex flex-col">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-t-3xl" />
            <div className="p-5 flex flex-col gap-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="mt-auto h-8 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {!showLoading && error && displayTrips.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-red-200 dark:border-red-900/40 mt-8">
          <MapPin className="w-16 h-16 text-red-300 dark:text-red-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Couldn't load trips</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => { fetchTrending(); fetchFeed(true); }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {isDone && !error && displayTrips.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 mt-8">
          <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            {searchQuery ? `No trips found for "${searchQuery}"` : "No trips yet"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery ? "Try a different destination or keyword." : "Be the first to share a trip with the community!"}
          </p>
        </div>
      )}

      {/* Intersection Observer Target */}
      <div ref={observerTarget} className="h-10 mt-10" />

    </div>
  );
}
