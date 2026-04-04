"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Bot, CloudSun, Map, Wallet, Home, Plane, Compass,
  ArrowRight, ShieldCheck, Zap, Globe2, Activity, MapPin, Ticket, CreditCard,
  CheckCircle2, Menu, X, ChevronDown, Rocket, Users, Lock, ChevronRight, PlayCircle
} from "lucide-react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-pure min-h-screen font-sans selection:bg-indigo-500/30 overflow-hidden text-main-pure">
      {/* ===== BACKGROUND MESH GLOW ===== */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-blue-500/20 rounded-full blur-[150px]" />
      </div>

      {/* ===== STICKY NAVBAR ===== */}
      <nav className="fixed top-0 w-full z-[100] bg-slate-950/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-all">
                <Plane className="w-5 h-5 text-white" />
             </div>
             <span className="text-2xl font-black tracking-tighter">TripSetGo<span className="text-indigo-500">.</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-bold text-sm">
            <Link href="#agents" className="text-muted-pure hover:text-main-pure transition-colors">Agents</Link>
            <Link href="#features" className="text-muted-pure hover:text-main-pure transition-colors">Features</Link>
            <Link href="#pricing" className="text-muted-pure hover:text-main-pure transition-colors">Pricing</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
             <Link href="/login" className="font-bold text-sm px-4 py-2 hover:text-indigo-500 transition-colors">Log In</Link>
             <Link href="/signup" className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
             </Link>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="fixed inset-0 z-40 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 text-2xl font-black"
          >
             <Link href="#agents" onClick={() => setMobileMenuOpen(false)}>Agents</Link>
             <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
             <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
             <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
             <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="px-8 py-4 bg-indigo-600 text-white rounded-full mt-4">Get Started</Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-32 pb-20">
        {/* ===== HERO SECTION ===== */}
        <section className="px-6 pt-32 md:pt-40 text-center max-w-5xl mx-auto flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pure bg-secondary-pure text-xs font-black uppercase tracking-widest text-indigo-500 mb-8"
          >
             <Sparkles className="w-4 h-4" /> Introducing TripSetGo v2.0
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[1.05] mb-6"
          >
            Travel Smarter, <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 animate-gradient-flow">
              Together.
            </span>
          </motion.h1>

          <motion.p 
             initial={{ opacity: 0, y: 20 }} 
             animate={{ opacity: 1, y: 0 }} 
             transition={{ duration: 0.5, delay: 0.2 }}
             className="text-lg md:text-2xl text-muted-pure font-bold max-w-3xl mb-12"
          >
            The world's first multi-agent AI travel orchestrator. Plan itineraries, split group finances, and manage all your trips in a stunning, collaborative workspace.
          </motion.p>

          <motion.div 
             initial={{ opacity: 0, y: 20 }} 
             animate={{ opacity: 1, y: 0 }} 
             transition={{ duration: 0.5, delay: 0.3 }}
             className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/signup" className="px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-5 card-pure border-2 border-pure rounded-[24px] font-black text-sm uppercase tracking-widest transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 flex items-center justify-center gap-3">
              <PlayCircle className="w-5 h-5 text-indigo-500" /> Watch Demo
            </button>
          </motion.div>
        </section>

        {/* ===== LIVE DASHBOARD PREVIEW ===== */}
        <section className="mt-20 px-4 md:px-10 max-w-7xl mx-auto relative">
           {/* Visual Glow */}
           <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] z-0 pointer-events-none" />
           <motion.div 
             initial={{ opacity: 0, y: 40 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, margin: "-100px" }}
             transition={{ duration: 0.8 }}
             className="relative z-10 rounded-[32px] md:rounded-[48px] bg-slate-900 border border-slate-700 dark:border-white/10 p-2 md:p-4 shadow-2xl overflow-hidden group scale-90 md:scale-100 origin-top transform-gpu"
           >
              {/* Browser Dots */}
              <div className="flex gap-2 px-4 py-3 mb-2 md:mb-4 absolute top-2 left-2 md:static z-20">
                 <div className="w-3 h-3 rounded-full bg-rose-500" />
                 <div className="w-3 h-3 rounded-full bg-amber-500" />
                 <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              
              <div className="relative rounded-[24px] md:rounded-[36px] overflow-hidden bg-[#0A0D14] border border-white/5 aspect-[16/10] md:aspect-[16/9]">
                 {/* Ghost UI Content */}
                 <div className="absolute inset-0 p-4 md:p-8 flex flex-col gap-6 blur-[2px] group-hover:blur-none transition-all duration-700">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3"><Map className="w-5 h-5 text-indigo-500" /><div className="h-2 w-10 bg-white/10 rounded-full animate-pulse"/></div>
                       <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3"><Wallet className="w-5 h-5 text-emerald-500" /><div className="h-2 w-10 bg-white/10 rounded-full animate-pulse"/></div>
                       <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3"><Users className="w-5 h-5 text-amber-500" /><div className="h-2 w-10 bg-white/10 rounded-full animate-pulse"/></div>
                    </div>
                    {/* Main Content Area */}
                    <div className="flex-1 grid grid-cols-3 gap-6">
                       {/* Main Chart */}
                       <div className="col-span-2 bg-white/5 rounded-3xl p-6 flex items-end gap-3 justify-between">
                          <div className="w-full bg-indigo-500/20 rounded-t-lg h-[40%]" />
                          <div className="w-full bg-indigo-500/20 rounded-t-lg h-[70%]" />
                          <div className="w-full bg-indigo-500/20 rounded-t-lg h-[50%]" />
                          <div className="w-full bg-indigo-500/20 rounded-t-lg h-[90%]" />
                          <div className="w-full bg-indigo-500/20 rounded-t-lg h-[60%]" />
                       </div>
                       {/* Recent Trips List */}
                       <div className="col-span-1 bg-white/5 rounded-3xl p-6 flex flex-col gap-4 justify-center">
                          {[1,2,3].map(i => (
                             <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                                <div className="flex flex-col gap-2 w-full">
                                   <div className="h-2 w-full bg-white/10 rounded-full" />
                                   <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
                 
                 {/* Overlay Text / CTA */}
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 group-hover:opacity-0 transition-opacity duration-500 pointer-events-none">
                    <button className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black tracking-widest uppercase text-sm rounded-full shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] pointer-events-auto transition-all">
                       Command Center View
                    </button>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* ===== SOCIAL PROOF / STATS ===== */}
        <section className="py-24 max-w-6xl mx-auto px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatItem val="10k+" label="Trips Planned via AI" delay={0} />
              <StatItem val="₹1Cr+" label="Group Expenses Split" delay={0.1} />
              <StatItem val="99%" label="Itinerary Accuracy" delay={0.2} />
           </div>
        </section>

        {/* ===== THE AGENTIC SHOWREEL ===== */}
        <section id="agents" className="py-24 overflow-hidden relative bg-slate-900 text-white">
           {/* Section Deco */}
           <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
           <div className="max-w-7xl mx-auto px-6 mb-16 text-center md:text-left flex flex-col md:flex-row items-end justify-between gap-8">
              <div>
                 <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">The Swarm.</h2>
                 <p className="text-slate-400 font-bold text-lg md:text-xl max-w-2xl">Seven highly specialized AI agents working concurrently to eliminate hours of manual planning.</p>
              </div>
              <Link href="/signup" className="text-indigo-400 font-black tracking-widest uppercase text-xs flex items-center gap-2 hover:text-white transition-colors">
                Meet the agents <ArrowRight className="w-4 h-4" />
              </Link>
           </div>

           {/* Showreel Track */}
           <div className="flex overflow-x-auto pb-16 px-6 gap-6 snap-x hide-scrollbar max-w-7xl mx-auto">
              {AgentsList.map((agent, i) => (
                <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: 50 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="min-w-[300px] max-w-[300px] snap-center bg-white/5 border border-white/10 p-8 rounded-[40px] hover:bg-white/10 hover:-translate-y-2 transition-all duration-300"
                >
                   <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mb-8 shadow-xl`}>
                      <agent.icon className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-2xl font-black mb-3">{agent.name}</h3>
                   <p className="text-slate-400 font-bold text-sm leading-relaxed">{agent.desc}</p>
                </motion.div>
              ))}
           </div>
        </section>

        {/* ===== CORE FEATURES GRID ===== */}
        <section id="features" className="py-32 max-w-7xl mx-auto px-6">
           <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-black text-main-pure tracking-tighter mb-6">Built for Scale.</h2>
              <p className="text-muted-pure font-bold text-lg max-w-2xl mx-auto">A trifecta of powerful tools seamlessly integrated to handle everything from pre-trip ideation to post-trip finance settling.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Feature 1: Antigravity Orchestrator */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="md:col-span-12 card-pure border border-pure rounded-[48px] p-8 md:p-14 overflow-hidden relative group"
              >
                  <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-indigo-50 dark:from-indigo-900/10 to-transparent -z-10" />
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 text-indigo-500/10 group-hover:scale-110 transition-transform duration-700 hidden md:block">
                     <Bot className="w-96 h-96" />
                  </div>
                  
                  <div className="max-w-xl">
                     <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                       <Zap className="w-4 h-4" /> Feature 1
                     </div>
                     <h3 className="text-4xl md:text-5xl font-black text-main-pure tracking-tighter mb-6">Antigravity Orchestrator</h3>
                     <p className="text-lg text-muted-pure font-bold leading-relaxed mb-8">Type a single sentence, and our orchestrator deploys the swarm. We fetch real-time routes, accommodations, and transit options, compiling them into a precise, actionable itinerary.</p>
                     <ul className="space-y-4 mb-8">
                        <FeatureTick text="Sub-second semantic intent parsing." />
                        <FeatureTick text="Fallback-safe deterministic logic." />
                        <FeatureTick text="Real-world distance & budget checking." />
                     </ul>
                  </div>
              </motion.div>

              {/* Feature 2: SplitCosts */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="md:col-span-6 card-pure border border-pure rounded-[48px] p-8 md:p-14 hover:border-emerald-500/50 transition-colors group"
              >
                 <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-[20px] flex items-center justify-center mb-8">
                    <Wallet className="w-8 h-8" />
                 </div>
                 <h3 className="text-3xl font-black tracking-tight text-main-pure mb-4">SplitCosts.</h3>
                 <p className="text-muted-pure font-bold mb-8">Group finances made mathematical and simple. Add expenses, use custom splits, and let our algorithm compute the simplified debt paths.</p>
                 <img src="/api/placeholder/400/200" alt="SplitCosts UI" className="w-full rounded-[24px] rounded-bl-[4px] border border-pure opacity-50 group-hover:opacity-100 transition-opacity blur-sm group-hover:blur-none" />
              </motion.div>

              {/* Feature 3: MyTrips Vault */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="md:col-span-6 card-pure border border-pure rounded-[48px] p-8 md:p-14 hover:border-purple-500/50 transition-colors group flex flex-col justify-between"
              >
                 <div>
                   <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-[20px] flex items-center justify-center mb-8">
                      <Lock className="w-8 h-8" />
                   </div>
                   <h3 className="text-3xl font-black tracking-tight text-main-pure mb-4">MyTrips Vault.</h3>
                   <p className="text-muted-pure font-bold mb-8">A centralized workspace for your past, ongoing, and saved plans. Toggle between active mode or editing mode effortlessly.</p>
                 </div>
                 <Link href="/signup" className="flex items-center justify-between w-full p-6 bg-secondary-pure rounded-[24px] uppercase tracking-widest text-xs font-black text-main-pure hover:bg-[var(--accent-primary)] hover:text-white transition-colors group-hover:scale-[1.02]">
                    Create Workspace <ArrowRight className="w-4 h-4" />
                 </Link>
              </motion.div>
           </div>
        </section>

        {/* ===== PRICING TIERS ===== */}
        <section id="pricing" className="py-32 bg-secondary-pure transition-colors">
          <div className="max-w-6xl mx-auto px-6">
             <div className="text-center mb-20">
                <h2 className="text-4xl md:text-6xl font-black text-main-pure tracking-tighter mb-4">Simple, Transparent Pricing.</h2>
                <p className="text-muted-pure font-bold">Start for free, scale when you travel the globe.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <PricingCard 
                   title="Explorer"
                   price="₹0"
                   period="forever"
                   desc="Perfect to taste the power of multi-agent AI."
                   features={["3 Basic AI Trips/month", "Standard SplitCosts", "1 Active Workspace", "Community Support"]}
                   cta="Sign Up Free"
                />
                <PricingCard 
                   title="Voyager"
                   price="₹199"
                   period="per year"
                   desc="Infinite exploration. Full API connectivity."
                   features={["Unlimited AI Trips", "Premium 'Swarm' access", "Advanced Splitwise Export", "Priority Support", "Real-Time Adjustments"]}
                   cta="Get Voyager"
                   highlight={true}
                />
             </div>
          </div>
        </section>

        {/* ===== FAQ & CTA ===== */}
        <section className="py-32 px-6 max-w-4xl mx-auto text-center border-b border-pure">
           <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-2xl">
              <Compass className="w-12 h-12 text-white -rotate-12" />
           </div>
           <h2 className="text-5xl md:text-7xl font-black text-main-pure tracking-tighter mb-8 leading-tight">
             Ready to leave the <br/>spreadsheets behind?
           </h2>
           <Link href="/signup" className="inline-flex px-12 py-6 bg-main-pure text-pure card-pure !bg-slate-900 dark:!bg-white dark:!text-slate-900 rounded-[32px] font-black text-lg uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl items-center gap-3">
              Get Started Now <ArrowRight />
           </Link>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-12 mt-12 max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-indigo-500" />
              <span className="font-black text-xl tracking-tighter text-main-pure">TripSetGo.</span>
           </div>
           
           <div className="flex gap-6 text-sm font-bold text-muted-pure">
              <Link href="#" className="hover:text-main-pure transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-main-pure transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-main-pure transition-colors">Twitter (X)</Link>
           </div>
           
           <p className="text-sm font-bold text-muted-pure flex items-center gap-2">
             Built by the Antigravity Swarm <span className="opacity-50">© 2026</span>
           </p>
        </footer>
      </main>
    </div>
  );
}

// Subcomponents
function StatItem({ val, label, delay }) {
  return (
    <motion.div 
       initial={{ opacity: 0, scale: 0.9 }}
       whileInView={{ opacity: 1, scale: 1 }}
       viewport={{ once: true }}
       transition={{ duration: 0.5, delay }}
       className="card-pure border border-pure p-10 rounded-[32px] text-center shadow-sm"
    >
       <p className="text-6xl font-black text-main-pure tracking-tighter mb-2">{val}</p>
       <p className="text-muted-pure font-bold tracking-widest uppercase text-xs">{label}</p>
    </motion.div>
  );
}

function FeatureTick({ text }) {
  return (
    <li className="flex items-center gap-3 font-bold text-main-pure">
       <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
       {text}
    </li>
  );
}

function PricingCard({ title, price, period, desc, features, cta, highlight }) {
  return (
    <div className={`card-pure rounded-[48px] p-10 relative overflow-hidden transition-transform duration-300 hover:-translate-y-2 ${highlight ? 'border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10 bg-indigo-50 dark:bg-indigo-900/10' : 'border border-pure shadow-sm'}`}>
      {highlight && (
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
      )}
      <div className="mb-8">
         <h4 className="font-black text-xl mb-2 text-main-pure">{title}</h4>
         <p className="text-muted-pure font-bold text-sm h-10">{desc}</p>
      </div>
      <div className="mb-8 flex items-end gap-2">
         <span className="text-6xl font-black tracking-tighter text-main-pure">{price}</span>
         <span className="text-muted-pure font-bold mb-2">/{period}</span>
      </div>
      <ul className="space-y-4 mb-10">
         {features.map((f, i) => (
           <li key={i} className="flex items-center gap-3 font-bold text-main-pure text-sm">
             <CheckCircle2 className={`w-5 h-5 shrink-0 ${highlight ? 'text-indigo-500' : 'text-slate-400'}`} /> {f}
           </li>
         ))}
      </ul>
      <Link href="/signup" className={`w-full py-5 rounded-full font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all ${highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'bg-secondary-pure border border-pure text-main-pure hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
         {cta} {highlight && <ArrowRight className="w-4 h-4" />}
      </Link>
    </div>
  )
}

// Data
const AgentsList = [
  { name: "Orchestrator", desc: "The brain. Delegates tasks and formats final output.", icon: Bot, gradient: "from-indigo-500 to-indigo-600" },
  { name: "Intent Analysis", desc: "Parses your prompt to extract structural variables.", icon: Activity, gradient: "from-purple-500 to-purple-600" },
  { name: "Destination", desc: "Verifies DB context to match vibe and feasibility.", icon: Globe2, gradient: "from-blue-500 to-blue-600" },
  { name: "Transport", desc: "Analyzes transit options and flight feasibility.", icon: Plane, gradient: "from-sky-500 to-sky-600" },
  { name: "Stay & Accom.", desc: "Finds optimal hotels scaling strictly to budget.", icon: Home, gradient: "from-emerald-500 to-emerald-600" },
  { name: "Itinerary", desc: "Builds day-by-day logical activity mappings.", icon: Compass, gradient: "from-amber-500 to-amber-600" },
  { name: "Budget Guard", desc: "Monitors overall cost vs the target budget constraint.", icon: Wallet, gradient: "from-rose-500 to-rose-600" },
];
