"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { useAuthStore } from "../store/authStore";
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

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
            <p className="sidebar-user-plan">Pro Member</p>
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
