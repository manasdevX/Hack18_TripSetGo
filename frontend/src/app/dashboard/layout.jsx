"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({ children }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated) {
      const token = localStorage.getItem("access_token");
      if (!isAuthenticated || !token) {
        if (!token && isAuthenticated) {
          useAuthStore.getState().logout();
        } else {
          router.push("/login");
        }
      }
    }
  }, [isAuthenticated, isHydrated, router]);

  // Prevent rendering anything (or you could show a loader) until hydration finishes
  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
