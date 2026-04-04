"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { useThemeStore } from "../store/themeStore";
import { useEffect } from "react";
import {
  PlaneTakeoff,
  LayoutDashboard,
  Map,
  Briefcase,
  BarChart2,
  Receipt,
  Settings,
  CreditCard,
  Compass,
  Bell,
  LogOut,
  Zap,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Discover",
    href: "/dashboard/discover",
    icon: Map,
  },
  {
    label: "Plan a Trip",
    href: "/dashboard/planner",
    icon: Compass,
  },
  {
    label: "My Trips",
    href: "/dashboard/trips",
    icon: Briefcase,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart2,
  },
  {
    label: "Split Costs",
    href: "/dashboard/expenses",
    icon: Receipt,
  },
  {
    label: "Subscription",
    href: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { subscription, fetchStatus } = useSubscriptionStore();
  const { darkMode, toggleDarkMode } = useThemeStore();

  // Fetch subscription on mount (lightweight)
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const plan = subscription?.subscription_type || "FREE";
  const dailyUsed = subscription?.daily_usage ?? 0;
  const dailyLimit = subscription?.daily_limit ?? 5;
  const usagePct = dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0;
  const isPro = plan !== "FREE";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <PlaneTakeoff className="w-5 h-5 text-white" />
        </div>
        <span className="sidebar-brand-name">TripSetGo</span>
      </div>

      <nav className="sidebar-nav flex-1 overflow-y-auto">
        <p className="sidebar-section-label">Navigation</p>
        <div className="space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive ? "sidebar-link--active" : ""}`}
              >
                <Icon className={`w-5 h-5`} />
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        {/* ── Usage Mini-Widget ── */}
        <Link
          href="/dashboard/subscription"
          className="block px-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all mb-3 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${isPro ? "text-indigo-400" : "text-slate-500"}`} />
              Daily Searches
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPro
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-slate-700/60 text-slate-400 border border-slate-700"
              }`}
            >
              {isPro ? "PRO" : "FREE"}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePct >= 100
                  ? "bg-red-500"
                  : usagePct >= 80
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-indigo-500 to-violet-500"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            <span className="text-white font-semibold">{dailyUsed}</span>
            {" / "}
            <span className="text-white font-semibold">{dailyLimit}</span>
            {" searches used today"}
          </p>
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="sidebar-link w-full mb-1 group"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-400 group-hover:-rotate-12 transition-transform" />
          )}
          <span className="text-sm font-semibold">{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button className="sidebar-notification-btn">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-bold">Updates</span>
          </div>
          <span className="sidebar-badge">3</span>
        </button>

        <div className="sidebar-user mt-4">
          <div className="relative shrink-0">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.full_name} 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "T"}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-sidebar)] rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="sidebar-user-name truncate">
              {user?.full_name || "Traveler"}
            </p>
            <p className="sidebar-user-plan">
              {isPro ? "Pro Member" : "Free Plan"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
