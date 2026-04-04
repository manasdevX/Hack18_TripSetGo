import Link from "next/link";
import {
  Sparkles,
  Map,
  Wallet,
  CloudSun,
  ArrowRight,
  Bot,
  Zap,
  Globe2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-pure transition-colors duration-700">
      {/* 🚀 HERO SECTION */}
      <section className="relative pt-32 pb-48 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-indigo-200/40 dark:from-indigo-900/10 via-sky-100/10 dark:via-transparent to-transparent blur-[120px] -z-10" />
        <div className="absolute top-60 -left-40 w-96 h-96 bg-violet-300/20 dark:bg-indigo-600/5 blur-[100px] rounded-full -z-10 animate-pulse" />
        <div className="absolute top-60 -right-40 w-96 h-96 bg-cyan-300/20 dark:bg-purple-600/5 blur-[100px] rounded-full -z-10 animate-pulse" />

        {/* Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 text-sm font-black mb-10 shadow-sm transition-all animate-bounce">
          <Zap className="w-4 h-4 fill-current" />
          <span>TripSetGo v2.0 is Live</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-6xl md:text-8xl font-black text-main-pure tracking-tight max-w-6xl mb-8 leading-[1.05] transition-all duration-700">
          Your smart trip planner, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 animate-gradient-flow">
            Multi-Agent AI.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-pure max-w-3xl mb-14 font-semibold leading-relaxed transition-colors duration-700">
          Ditch the tabs. Four specialized AI agents collaborate to optimize 
          your routes, weather, and budget in a single click.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-6 z-10">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95"
          >
            Start Planning Free <ArrowRight className="w-6 h-6" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xl flex items-center justify-center transition-all hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          >
            View My Dashboard
          </Link>
        </div>
      </section>

      {/* 🤖 THE 4 AGENTS SECTION */}
      <section className="py-32 relative z-20 transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-7xl font-black text-main-pure mb-8 tracking-tighter">
              Meet the <span className="text-indigo-600">Swarm.</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-pure max-w-3xl mx-auto font-bold leading-relaxed">
              We've replaced the single chatbot with an elite team. 
              Each agent is a specialist in its domain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AgentCard 
              icon={Bot} 
              title="The Orchestrator" 
              desc="The collective brain. It interprets your prompts, assigns tasks to sub-agents, and refines the final itinerary."
              color="indigo"
            />
            <AgentCard 
              icon={CloudSun} 
              title="Weather Sage" 
              desc="Live atmospheric tracking. Automatically adjusts plans for rain, humidity, and heatwaves."
              color="sky"
            />
            <AgentCard 
              icon={Map} 
              title="Geography Scout" 
              desc="Real-time traffic and route calculation. Ensures every stop is geographically optimized."
              color="emerald"
            />
            <AgentCard 
              icon={Wallet} 
              title="Fiscal Guard" 
              desc="Financial oversight. Keeps your travel costs strictly within your specified budget constraints."
              color="violet"
            />
          </div>
        </div>
      </section>

      {/* Mini Footer */}
      <footer className="py-12 text-center text-muted-pure border-t border-pure transition-all duration-700">
        <div className="flex items-center justify-center gap-3 font-black text-lg mb-4">
          <PlaneTakeoff className="w-6 h-6 text-indigo-600" /> TripSetGo
        </div>
        <p className="font-bold opacity-60 italic">© 2026 TripSetGo. Experience the future of travel.</p>
      </footer>
    </div>
  );
}

function AgentCard({ icon: Icon, title, desc, color }) {
  const colorMap = {
    indigo: "from-indigo-500 to-indigo-600",
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    violet: "from-violet-500 to-violet-600",
  };

  return (
    <div className="card-pure p-12 rounded-[40px] hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
      <div className={`w-20 h-20 bg-gradient-to-br ${colorMap[color]} text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl group-hover:rotate-6 transition-all duration-500`}>
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-3xl font-black mb-6 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {title}
      </h3>
      <p className="text-muted-pure text-lg font-bold leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function PlaneTakeoff({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M2 22 12 2l10 20Z"></path>
      <path d="M6 12h12"></path>
      <path d="M12 2v20"></path>
    </svg>
  );
}
