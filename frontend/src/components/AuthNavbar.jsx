"use client";
import Link from "next/link";
import { Plane, MoveRight } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AuthNavbar() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <nav className="fixed top-0 w-full z-[100] backdrop-blur-md bg-slate-950/50 border-b border-white/5 transition-all duration-300 text-white">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-all">
              <Plane className="w-5 h-5 text-white" />
           </div>
           <span className="text-2xl font-black tracking-tighter text-white">TripSetGo<span className="text-indigo-500">.</span></span>
        </Link>
        <div className="flex items-center gap-4">
           <Link 
             href={isLoginPage ? "/signup" : "/login"} 
             className="hidden md:block font-bold text-sm px-4 py-2 hover:text-indigo-400 transition-colors"
           >
             {isLoginPage ? "Sign Up" : "Log In"}
           </Link>
           <Link href="/signup" className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
              Get Started <MoveRight className="w-4 h-4" />
           </Link>
        </div>
      </div>
    </nav>
  );
}
