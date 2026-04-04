"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
