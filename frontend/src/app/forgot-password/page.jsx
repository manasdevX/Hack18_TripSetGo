"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, isLoading, error: storeError, clearError, isAuthenticated, isHydrated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    useAuthStore.setState({ isLoading: false, error: null });
    clearError?.();
  }, [clearError]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    
    if (!email.includes("@")) {
      setLocalError("Please enter a valid email address");
      return;
    }

    try {
      await forgotPassword(email);
      setSubmitted(true);
      // Redirect to OTP verification page after 1 second
      setTimeout(() => {
        sessionStorage.setItem("password_recovery_email", email);
        router.push("/verify-password-otp");
      }, 1000);
    } catch (err) {
      setLocalError(storeError || "Failed to process your request");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-[440px] bg-white dark:bg-[#151d2e] rounded-[48px] shadow-2xl dark:shadow-indigo-500/10 p-10 border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        )}

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
            <Mail className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Forgot Password?</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {submitted 
              ? "Check your email for the OTP code" 
              : "Enter your email to receive a recovery code"}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required 
              />
            </div>

            {localError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-800">
                <AlertCircle size={16} /> {localError}
              </div>
            )}

            {storeError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-800">
                <AlertCircle size={16} /> {storeError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "Sending OTP..." : "Send Recovery Code"}
              {!isLoading && <Sparkles size={20} />}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                ✅ Recovery code sent to <strong>{email}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-3">
                Check your email (and spam folder) for a 6-digit code. You'll enter it on the next page.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link 
            href="/login" 
            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
          <Link 
            href="/signup" 
            className="text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
