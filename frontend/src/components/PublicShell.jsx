"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isHydrated, isAuthenticated } = useAuthStore();

  // 1. Identify where we are
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isLandingPage = pathname === "/";

  // 2.5. BUG FIX: Redirect authenticated users away from auth pages & landing page
  // ⚠️ CRITICAL: This must be BEFORE the isHydrated check to maintain consistent hook count
  useEffect(() => {
    if (isHydrated && isAuthenticated && (isAuthPage || isLandingPage)) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, isAuthPage, isLandingPage, router]);

  // 2. SAFETY: If the store hasn't finished reading from localStorage, 
  // show a clean loader instead of flickering the Login page.
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // 3. DASHBOARD FLOW:
  // If we are in the dashboard, the Sidebar/Layout handles everything.
  if (isDashboard) {
    return <>{children}</>;
  }

  // 4. AUTH PAGE FLOW (Login/Signup):
  // We remove the Navbar and Footer for a clean, centered look.
  if (isAuthPage) {
    // Return null while redirect is in progress if user is authenticated
    if (isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FBFBFE] flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          {children}
        </main>
      </div>
    );
  }

  // 4.5. LANDING PAGE: Redirect authenticated users to dashboard
  if (isLandingPage && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // 5. PUBLIC FLOW (Landing Page, etc.):
  // Normal wrap with Navbar and Footer.
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}