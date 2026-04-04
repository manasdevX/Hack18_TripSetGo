"use client";
import { useState } from "react";
import { 
  Calendar, 
  MapPin, 
  MoreVertical, 
  Plus, 
  Search, 
  Filter,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function TripsPage() {
  const [filter, setFilter] = useState("all");

  const trips = [
    {
      id: 1,
      destination: "Paris, France",
      date: "Oct 12 - Oct 18, 2023",
      status: "Upcoming",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      destination: "Tokyo, Japan",
      date: "Dec 05 - Dec 15, 2023",
      status: "Planning",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in group">
      {/* Reverted Heading to Size text-5xl */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-main-pure mb-6 uppercase tracking-tighter">
            Your Expeditions
          </h1>
          <p className="text-muted-pure font-bold uppercase tracking-widest text-sm">
            Chronology of your past, present, and future planetary movements.
          </p>
        </div>
        <Link
          href="/dashboard/planner"
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-indigo-500/20 uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" /> New Journey
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-pure group-focus-within:text-accent-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH JOURNEYS..."
            className="w-full bg-card-pure border border-pure py-5 pl-14 pr-6 rounded-2xl text-main-pure font-black text-xs tracking-widest uppercase outline-none focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3">
          {["all", "upcoming", "past"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border-2 ${
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/20"
                  : "bg-card-pure text-muted-pure border-pure hover:border-indigo-500/10 hover:text-indigo-600 shadow-sm"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="group card-pure rounded-[40px] overflow-hidden border border-pure hover:border-indigo-500/20 transition-all duration-500 flex flex-col hover:-translate-y-3 shadow-sm hover:shadow-2xl"
          >
            <div className="relative h-64 overflow-hidden">
              <img
                src={trip.image}
                alt={trip.destination}
                className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
              />
              <div className="absolute top-6 right-6">
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-xl border border-white/20 text-white font-black text-[10px] rounded-xl uppercase tracking-widest shadow-lg">
                  {trip.status}
                </span>
              </div>
            </div>
            <div className="p-10 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-main-pure uppercase tracking-tighter leading-none group-hover:text-indigo-600 transition-colors">
                  {trip.destination}
                </h3>
                <button className="text-muted-pure hover:text-main-pure p-1 hover:bg-secondary-pure rounded-lg transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 mb-10 flex-1">
                <div className="flex items-center gap-3 text-muted-pure">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-widest">{trip.date}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-pure">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-widest">Multi-Node Route</span>
                </div>
              </div>
              <button className="w-full flex items-center justify-between px-8 py-5 bg-secondary-pure hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all group/btn shadow-inner">
                View Matrix <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
