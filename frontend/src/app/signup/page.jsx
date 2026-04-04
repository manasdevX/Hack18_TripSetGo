"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Sparkles, CheckCircle2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import Link from "next/link";
import AuthNavbar from "../../components/AuthNavbar";

export default function SignupPage() {
  const router = useRouter();
  const { signup, sendSignupOTP, verifySignupOTP, isEmailVerified, setVerification, googleStart, isLoading, error: storeError, clearError, isAuthenticated, isHydrated } = useAuthStore();
  const { darkMode } = useThemeStore();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", otp: "" });
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [localError, setLocalError] = useState("");

  // Professional Reset & Prefill
  useEffect(() => {
    useAuthStore.setState({ isLoading: false, error: null });
    clearError?.();

    const preEmail = sessionStorage.getItem("prefill_email");
    const preName = sessionStorage.getItem("prefill_name");
    const isGoogle = sessionStorage.getItem("google_verified") === "true";

    if (preEmail) {
      setForm(f => ({ ...f, email: preEmail, fullName: preName || "" }));
      if (isGoogle) setVerification(true);
      
      // Clear session after consuming
      sessionStorage.removeItem("prefill_email");
      sessionStorage.removeItem("prefill_name");
      sessionStorage.removeItem("google_verified");
    }
  }, [clearError, setVerification]);

  // 🔒 SECURITY: Redirect authenticated users away from signup page
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSendOTP = async () => {
    if (!form.email.includes("@")) return setLocalError("Enter a valid email address");
    setLocalError("");
    try {
      await sendSignupOTP(form.email);
      setOtpSent(true);
    } catch (e) {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleVerifyOTP = async () => {
    setLocalError("");
    try {
      await verifySignupOTP(form.email, form.otp);
    } catch (e) {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleFinalSignup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setLocalError("Passwords do not match");
    setLocalError("");
    try {
      await signup(form.email, form.fullName, form.password);
      router.push("/dashboard");
    } catch (e) {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleGoogle = async (res) => {
    setLocalError("");
    try {
      const data = await googleStart(res.credential);
      if (data.status === "SUCCESS") {
        router.push("/dashboard");
      } else if (data.status === "SIGNUP_REQUIRED") {
        useAuthStore.setState({ isLoading: false });
        setForm({ ...form, email: data.email, fullName: data.full_name });
        setVerification(true);
      }
    } catch (err) {
      useAuthStore.setState({ isLoading: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col transition-colors duration-300">
      <AuthNavbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-32 pb-10">
        <div className="w-full max-w-[480px] bg-white dark:bg-[#151d2e] rounded-[32px] shadow-2xl dark:shadow-emerald-500/10 p-8 md:p-10 border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all">
        
        {/* Subtle top loading bar if you prefer it over a full overlay */}
        {isLoading && (
          <div className="absolute top-0 left-0 h-1 bg-emerald-500 dark:bg-emerald-400 animate-pulse w-full" />
        )}

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 dark:bg-emerald-600 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-emerald-100 dark:shadow-emerald-900/20 shadow-lg">
            <Sparkles className="text-white w-7 h-7 -rotate-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Get Started</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Create your travel profile</p>
        </div>

        <form onSubmit={handleFinalSignup} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
            <input
              type="email"
              disabled={isEmailVerified}
              placeholder="Email address"
              className="w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-70 font-medium border border-transparent dark:border-slate-700/50"
              value={form.email}
              onChange={(e) => { setForm({...form, email: e.target.value}); setVerification(false); setOtpSent(false); }}
            />
            {!isEmailVerified && (
              <button 
                type="button"
                disabled={isLoading}
                onClick={handleSendOTP}
                className="absolute right-3 top-2.5 px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors"
              >
                {isLoading && !otpSent ? <Loader2 className="animate-spin w-3 h-3"/> : "Verify"}
              </button>
            )}
            {isEmailVerified && <CheckCircle2 className="absolute right-4 top-4 text-emerald-500 w-6 h-6 animate-in zoom-in" />}
          </div>

          {otpSent && !isEmailVerified && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                type="text"
                placeholder="6-digit OTP"
                className="flex-1 px-4 py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-center font-black tracking-[0.3em] outline-none dark:text-white"
                value={form.otp}
                onChange={(e) => setForm({...form, otp: e.target.value})}
              />
              <button 
                type="button"
                onClick={handleVerifyOTP}
                disabled={isLoading}
                className="px-6 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Confirm"}
              </button>
            </div>
          )}

          <div className={`space-y-4 transition-all duration-500 ${isEmailVerified ? "opacity-100 scale-100" : "opacity-25 scale-95 pointer-events-none blur-[1px]"}`}>
            <div className="relative">
              <User className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Full Name"
                className="w-full pl-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium border border-transparent dark:border-slate-700/50"
                value={form.fullName}
                onChange={(e) => setForm({...form, fullName: e.target.value})}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Create Password"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium border border-transparent dark:border-slate-700/50"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-4 text-slate-400 hover:text-emerald-600 transition-colors">
                {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium border border-transparent dark:border-slate-700/50"
              value={form.confirmPassword}
              onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
            />
          </div>

          {(localError || storeError) && (
            <div className="flex items-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl text-xs font-bold border border-red-100 dark:border-red-800">
              <AlertCircle size={14} /> {localError || (typeof storeError === 'string' ? storeError : "An error occurred")}
            </div>
          )}

          <button
            disabled={!isEmailVerified || isLoading}
            className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg disabled:bg-slate-200 dark:disabled:bg-slate-800 transition-all active:scale-95 mt-2 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Complete Signup"}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
          <span className="relative bg-white dark:bg-[#151d2e] px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Quick Join</span>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
              <GoogleLogin 
                onSuccess={handleGoogle} 
                onError={() => useAuthStore.setState({ isLoading: false })}
                shape="pill" 
                width="400" 
                theme={darkMode ? 'filled_blue' : 'outline'}
              />
            </GoogleOAuthProvider>
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
            Member? <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}