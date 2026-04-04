"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Map,
  CloudRain,
  Navigation,
  Clock,
  Coffee,
  Camera,
  Utensils,
} from "lucide-react";

export default function ActiveTripPage() {
  const params = useParams();
  const tripId = params.id; // We will use this later to fetch real data from FastAPI!

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      {/* Top Navigation */}
      <Link
        href="/dashboard/trips"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      {/* Hero Header: Travel Mode Active */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold text-sm tracking-wide uppercase">
                Travel Mode Active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Day 2 in Goa
            </h1>
            <p className="text-slate-400">Thursday, April 16, 2026</p>
          </div>

          <button className="bg-white text-slate-900 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
            <Map className="w-5 h-5" /> Open Maps
          </button>
        </div>
      </div>

      {/* AI Live Alert */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 mb-8 flex items-start gap-4 shadow-sm">
        <div className="bg-sky-100 text-sky-600 p-2 rounded-xl mt-1">
          <CloudRain className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sky-900 font-bold mb-1">Weather Agent Update</h4>
          <p className="text-sky-700 text-sm leading-relaxed">
            Light rain is expected around 2:00 PM near the beaches. I have
            updated your itinerary to move the Dudhsagar Waterfall trek to
            tomorrow, and scheduled the indoor Basilica of Bom Jesus tour for
            this afternoon instead.
          </p>
        </div>
      </div>

      {/* Today's Itinerary Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Today's Schedule
        </h3>

        <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8 pl-8 md:pl-10">
          {/* Completed Event */}
          <div className="relative opacity-50">
            <div className="absolute -left-[41px] md:-left-[49px] w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center border-4 border-white">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-400 mb-1">
              09:00 AM
            </div>
            <h4 className="text-lg font-bold text-slate-700">
              Breakfast at Artjuna
            </h4>
            <p className="text-slate-500 text-sm">
              Mediterranean cafe in Anjuna.
            </p>
          </div>

          {/* Current Event (Active) */}
          <div className="relative">
            <div className="absolute -left-[41px] md:-left-[49px] w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md shadow-indigo-200">
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-indigo-600 mb-1">
              11:30 AM{" "}
              <span className="text-xs bg-indigo-100 px-2 py-0.5 rounded-full ml-2">
                Happening Now
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              Explore Aguada Fort
            </h4>
            <p className="text-slate-600 text-sm mb-3">
              17th-century Portuguese fort standing on Sinquerim Beach.
            </p>
            <button className="text-sm text-indigo-600 font-semibold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
              <Navigation className="w-4 h-4" /> Get Directions
            </button>
          </div>

          {/* AI Modified Event */}
          <div className="relative">
            <div className="absolute -left-[41px] md:-left-[49px] w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center border-4 border-white">
              <CloudRain className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
              02:30 PM{" "}
              <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                AI Swapped
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Basilica of Bom Jesus
            </h4>
            <p className="text-slate-600 text-sm">
              Indoor activity to avoid the forecasted rain. UNESCO World
              Heritage site.
            </p>
          </div>

          {/* Future Event */}
          <div className="relative">
            <div className="absolute -left-[41px] md:-left-[49px] w-8 h-8 bg-white border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-500 mb-1">
              08:00 PM
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Dinner at Gunpowder
            </h4>
            <p className="text-slate-600 text-sm">
              South Indian coastal cuisine. Reservation confirmed for 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
