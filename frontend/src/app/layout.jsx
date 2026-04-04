"use client";
import "./globals.css";
import PublicShell from "../components/PublicShell";
import { Inter, Montserrat } from "next/font/google";
import { useThemeStore } from "../store/themeStore";
import { useEffect, useState } from "react";

// Professional Font Loading
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap' 
});

const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: "--font-montserrat",
  weight: ['800', '900'],
  display: 'swap'
});

export default function RootLayout({ children }) {
  const { darkMode } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync dark class on every change (ensures instant toggle from Sidebar)
  useEffect(() => {
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode, mounted]);

  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={`${inter.variable} ${montserrat.variable} scroll-smooth ${mounted && darkMode ? "dark" : ""}`}
    >
      <head>
        {/* Anti-Flicker Script: Helps prevent white flashes during theme/auth loading */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const storage = localStorage.getItem('auth-storage');
              if (storage) {
                const { state } = JSON.parse(storage);
                if (state.isAuthenticated && window.location.pathname === '/login') {
                  window.location.href = '/dashboard';
                }
              }
              
              // Immediate theme application to prevent flash
              const themeStorage = localStorage.getItem('theme-storage');
              if (themeStorage) {
                const { state } = JSON.parse(themeStorage);
                if (state.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              }
            })();
          `
        }} />
      </head>
      <body className="antialiased min-h-screen selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-300">
        
        {/* Subtle Background Mesh Gradient - Updated for Dark Mode */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-sky-500/10 dark:bg-purple-500/20 blur-[100px]" />
        </div>

        <PublicShell>
          {/* Main Content Area with optimized padding */}
          <main className="relative flex-1">
            {children}
          </main>
        </PublicShell>

        {/* Global Portals (Toasts, Modals, etc.) could go here */}
      </body>
    </html>
  );
}