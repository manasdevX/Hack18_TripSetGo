"use client";
import { useState } from "react";
import {
  Search,
  Filter,
  Heart,
  Globe,
  MapPin,
  Star,
  Copy,
  Zap,
  TrendingUp,
  Sparkles
} from "lucide-react";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const communityTrips = [
    {
      id: 1,
      title: "7 Days in Tokyo & Kyoto",
      author: "Alex Rivers",
      likes: "1.2k",
      rating: 4.9,
      tags: ["Culture", "Food", "City"],
      image: "from-rose-400 to-orange-400",
      description: "A deep dive into the neon streets of Shinjuku and the serene temples of Kyoto.",
    },
    {
      id: 2,
      title: "Amalfi Coast Road Trip",
      author: "Sarah J.",
      likes: "850",
      rating: 4.8,
      tags: ["Luxury", "Coastal", "Summer"],
      image: "from-cyan-400 to-blue-500",
      description: "Driving the winding cliffs of Italy with stops in Positano and Amalfi.",
    },
    {
      id: 3,
      title: "Iceland Northern Lights",
      author: "Marco K.",
      likes: "2.4k",
      rating: 5.0,
      tags: ["Adventure", "Winter", "Nature"],
      image: "from-indigo-600 to-purple-700",
      description: "The ultimate winter itinerary for hunting the Aurora Borealis and Blue Lagoon.",
    },
    {
      id: 4,
      title: "Goa Beach Hopping",
      author: "Manas A.",
      likes: "560",
      rating: 4.7,
      tags: ["Beach", "Party", "Budget"],
      image: "from-emerald-400 to-teal-500",
      description: "The best hidden shacks in North Goa and the quiet sunsets of South Goa.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20 px-4 sm:px-0">
      {/* Restored Hero - NO ITALIC - Original Text Capitalization */}
      <div className="relative rounded-[40px] overflow-hidden bg-indigo-600 dark:bg-slate-900 p-12 md:p-20 mb-16 text-center shadow-lg border border-pure group transition-colors">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-none tracking-tighter uppercase">
            EXPLORE DESTINATIONS<span className="text-indigo-400">.</span>
          </h1>
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="SEARCH DESTINATIONS, THEMES, OR CREATORS..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 py-6 pl-16 pr-8 rounded-[24px] text-white outline-none focus:bg-white/20 shadow-sm transition-all placeholder:text-white/40 font-black text-xs tracking-widest uppercase"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {["SOLO", "ADVENTURE", "BACKPACKER", "LUXURY", "FOODIE"].map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-black text-white/60 hover:text-white cursor-pointer transition-all px-4 py-1.5 bg-white/10 rounded-xl border border-white/10 tracking-[0.2em] uppercase"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-black text-main-pure flex items-center gap-4 tracking-tighter uppercase leading-none">
          <TrendingUp className="w-8 h-8 text-indigo-600" /> COMMUNITY BLUEPRINTS
        </h2>
        <button className="flex items-center gap-3 px-6 py-3 bg-secondary-pure border border-pure rounded-2xl text-[10px] font-black text-muted-pure hover:text-main-pure transition-all active:scale-95 shadow-sm">
          <Filter className="w-4 h-4" /> FILTERS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {communityTrips.map((trip) => (
          <div key={trip.id} className="group card-pure rounded-[40px] border border-pure hover:border-indigo-500/20 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full hover:-translate-y-3">
            <div className={`h-56 bg-gradient-to-br ${trip.image} p-8 relative flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  {trip.tags.map((tag) => (
                    <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-white/20">
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="bg-white/20 backdrop-blur-md p-3 rounded-2xl text-white hover:bg-rose-500 transition-colors shadow-lg border border-white/20">
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-white bg-black/20 backdrop-blur-md w-fit px-3 py-1 rounded-lg border border-white/10">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-black text-xs">{trip.rating}</span>
                <span className="text-white/60 text-[10px] font-bold uppercase">({trip.likes} LIKES)</span>
              </div>
            </div>

            <div className="p-8 flex flex-col flex-grow bg-white dark:bg-transparent transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-secondary-pure text-main-pure rounded-full flex items-center justify-center text-[10px] font-black border border-pure">
                  {trip.author.charAt(0)}
                </div>
                <span className="text-xs font-black text-muted-pure uppercase tracking-widest">
                  BY {trip.author}
                </span>
              </div>
              <h3 className="text-2xl font-black text-main-pure mb-4 group-hover:text-indigo-600 transition-colors tracking-tight uppercase leading-none">
                {trip.title}
              </h3>
              <p className="text-muted-pure text-sm leading-relaxed mb-8 flex-grow font-extrabold opacity-70 group-hover:opacity-100 transition-opacity">
                {trip.description}
              </p>
              <div className="flex gap-3">
                <button className="flex-grow bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95 shadow-indigo-500/20">
                  VIEW MATRIX
                </button>
                <button className="px-6 py-4 bg-secondary-pure text-indigo-600 rounded-2xl font-black text-[10px] border border-pure hover:bg-pure transition-all uppercase tracking-widest">
                  CLONE
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-indigo-600 dark:bg-card-pure rounded-[40px] p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-lg relative overflow-hidden transition-colors border border-pure">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-8 relative z-10 text-center lg:text-left flex-col lg:flex-row">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
            <Zap className="w-10 h-10 text-indigo-600 stroke-[3px]" />
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter mb-2 uppercase leading-none">CAN'T FIND THE PERFECT TRIP?</h3>
            <p className="text-white/80 text-lg font-bold">
              Initiate your personalized AI Fleet to build a custom itinerary from scratch.
            </p>
          </div>
        </div>
        <button className="bg-white text-indigo-600 px-12 py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-indigo-800/10 shrink-0 group">
          START AI PLANNER <Sparkles className="w-5 h-5 inline-block ml-2 mb-1 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
}
