"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Fingerprint, Eye, EyeOff, Loader2, AlertCircle, Info } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, googleStart, isLoading, error: storeError, clearError, isAuthenticated, isHydrated } = useAuthStore();
  const { darkMode } = useThemeStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState("");

  // Force reset loading on mount to kill any infinite spinners
  useEffect(() => {
    useAuthStore.setState({ isLoading: false, error: null });
    clearError?.();
  }, [clearError]);

  // 🔒 SECURITY: Redirect authenticated users away from login page
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRedirectInfo("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err.response?.status === 404) {
        useAuthStore.setState({ isLoading: false }); // Kill loader for redirect
        setRedirectInfo("No account found. Redirecting you to signup...");
        sessionStorage.setItem("prefill_email", email);
        setTimeout(() => router.push("/signup"), 1800);
      }
    }
  };

  const handleGoogleSuccess = async (res) => {
    setRedirectInfo("");
    try {
      const data = await googleStart(res.credential);
      if (data.status === "SUCCESS") {
        router.push("/dashboard");
      } else if (data.status === "SIGNUP_REQUIRED") {
        useAuthStore.setState({ isLoading: false }); // Kill loader for redirect
        setRedirectInfo("Google verified! Let's finish your profile...");
        sessionStorage.setItem("prefill_email", data.email);
        sessionStorage.setItem("prefill_name", data.full_name);
        sessionStorage.setItem("google_verified", "true");
        setTimeout(() => router.push("/signup"), 1500);
      }
    } catch (err) {
      useAuthStore.setState({ isLoading: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-[440px] bg-white dark:bg-[#151d2e] rounded-[32px] shadow-2xl dark:shadow-indigo-500/10 p-10 border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        )}

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
            <Fingerprint className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="email" 
              placeholder="Email address" 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type={showPass ? "text" : "password"} 
              placeholder="Password" 
              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-4 text-slate-400 hover:text-indigo-600 transition-colors">
              {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
          </div>

          <div className="flex justify-end">
            <Link 
              href="/forgot-password" 
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {redirectInfo && (
            <div className="flex items-center gap-2 p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs font-bold animate-pulse border border-indigo-100 dark:border-indigo-800">
              <Info size={16} /> {redirectInfo}
            </div>
          )}

          {storeError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-800">
              <AlertCircle size={16} /> {storeError}
            </div>
          )}

          <button 
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Authenticating..." : "Login"}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
          <span className="relative bg-white dark:bg-[#151d2e] px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Secure Login</span>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
              <GoogleLogin 
                onSuccess={handleGoogleSuccess} 
                onError={() => useAuthStore.setState({ isLoading: false })}
                shape="pill" 
                width="360" 
                theme={darkMode ? 'filled_blue' : 'outline'}
              />
            </GoogleOAuthProvider>
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
            New traveler? <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}