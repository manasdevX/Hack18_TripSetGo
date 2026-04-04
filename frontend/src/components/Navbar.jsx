"use client";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { PlaneTakeoff, User, LogOut, Sparkles } from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-lg shadow-slate-200">
            <PlaneTakeoff className="w-5 h-5 -rotate-12" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">
            TripSetGo
          </span>
        </Link>

        {/* Auth Controls */}
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-slate-900 leading-none mb-1">
                  {user?.full_name || "Traveler"}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Online</span>
                </div>
              </div>
              
              {/* Profile Image Pill */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 pr-3 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt="profile" 
                    referrerPolicy="no-referrer" /* ✨ ADD THIS LINE ✨ */
                    className="w-8 h-8 rounded-xl object-cover shadow-sm ring-2 ring-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                    {user?.full_name?.charAt(0) || "T"}
                  </div>
                )}
                <LogOut 
                  onClick={logout}
                  className="w-4 h-4 text-slate-400 hover:text-rose-500 transition-colors ml-1" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}