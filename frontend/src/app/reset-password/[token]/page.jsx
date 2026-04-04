"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Shield, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token;
  
  const { resetPassword, isLoading, error: storeError, clearError, isAuthenticated, isHydrated } = useAuthStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  // Reset loading and errors on mount
  useEffect(() => {
    useAuthStore.setState({ isLoading: false, error: null });
    clearError?.();
    
    if (!token) {
      setLocalError("Invalid reset token. Please request a new one.");
    }
  }, [clearError, token]);

  // 🔒 SECURITY: Redirect authenticated users away from reset-password page
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  // Calculate password strength (visual feedback)
  useEffect(() => {
    if (!password) {
      setPasswordStrength("");
      return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) setPasswordStrength("weak");
    else if (strength <= 3) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    
    // Validation: Password length
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long");
      return;
    }

    // Validation: Passwords match
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    // Validation: Password strength
    if (passwordStrength === "weak") {
      setLocalError("Password is too weak. Use uppercase, numbers, and special characters");
      return;
    }

    try {
      await resetPassword(token, password);
      setSubmitted(true); // Show success state
    } catch (err) {
      setLocalError(storeError || "Failed to reset password. Please try again.");
    }
  };

  const passwordStrengthColor = {
    weak: "text-red-500",
    medium: "text-yellow-500",
    strong: "text-green-500"
  };

  const passwordStrengthBg = {
    weak: "bg-red-50 dark:bg-red-900/30",
    medium: "bg-yellow-50 dark:bg-yellow-900/30",
    strong: "bg-green-50 dark:bg-green-900/30"
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
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {submitted ? "Password Reset" : "Create New Password"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {submitted 
              ? "Your password has been successfully updated" 
              : "Make it strong and unique"}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="New password" 
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-4 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className={`px-4 py-3 rounded-2xl border transition-all ${passwordStrengthBg[passwordStrength] || ""}`}>
                <p className={`text-xs font-bold ${passwordStrengthColor[passwordStrength]} capitalize`}>
                  Password Strength: {passwordStrength}
                </p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-all ${
                        passwordStrength === "weak" && i <= 2 ? "bg-red-500" :
                        passwordStrength === "medium" && i <= 3 ? "bg-yellow-500" :
                        passwordStrength === "strong" && i <= 5 ? "bg-green-500" :
                        "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />
              <input 
                type={showConfirm ? "text" : "password"} 
                placeholder="Confirm password" 
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirm(!showConfirm)} 
                className="absolute right-4 top-4 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showConfirm ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>

            {/* Match Indicator */}
            {confirmPassword && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold border ${
                password === confirmPassword
                  ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
              }`}>
                {password === confirmPassword ? (
                  <>
                    <CheckCircle2 size={16} /> Passwords match
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} /> Passwords do not match
                  </>
                )}
              </div>
            )}

            {/* Error Messages */}
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
              disabled={isLoading || password !== confirmPassword || password.length < 8}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
              {!isLoading && <ArrowRight size={20} />}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="text-green-600 dark:text-green-400 w-8 h-8" />
              </div>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                Your password is now secure! You can log in with your new credentials.
              </p>
            </div>

            <Link 
              href="/login" 
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700"
            >
              Go Back to Login
              <ArrowRight size={20} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
