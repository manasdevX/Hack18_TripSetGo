"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle, Loader2, Check } from "lucide-react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Check if reset token was provided
  useEffect(() => {
    const resetToken = sessionStorage.getItem("reset_token");
    const verified = sessionStorage.getItem("otp_verified") === "true";
    
    if (!resetToken || !verified) {
      setError("Invalid session. Please start password recovery again.");
      setTimeout(() => router.push("/forgot-password"), 2000);
    } else {
      setIsVerified(true);
    }
  }, [router]);

  const validatePassword = (pass) => {
    const requirements = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*()_+{}\[\]:;<>,.?/~`-]/.test(pass),
    };
    return requirements;
  };

  const requirements = validatePassword(password);
  const isPasswordValid = Object.values(requirements).every(req => req);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet all requirements");
      return;
    }

    setIsLoading(true);

    try {
      const resetToken = sessionStorage.getItem("reset_token");
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reset_token: resetToken,
          new_password: password 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to reset password");
      }

      // Clear session data
      sessionStorage.removeItem("reset_token");
      sessionStorage.removeItem("otp_verified");
      sessionStorage.removeItem("password_recovery_email");

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white dark:bg-[#151d2e] rounded-[48px] shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Invalid Session</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {error || "Your session has expired. Redirecting..."}
            </p>
            <Link
              href="/forgot-password"
              className="inline-block mt-6 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all"
            >
              Start Over
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {success ? "Password Reset!" : "Reset Password"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {success ? "Your password has been updated successfully" : "Create a new, strong password"}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold text-sm mb-2 block">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter new password" 
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2">
                <p className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wide">Requirements:</p>
                <div className="space-y-1">
                  {Object.entries(requirements).map(([req, met]) => (
                    <div key={req} className={`flex items-center gap-2 text-xs font-medium ${met ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>
                      <Check size={14} /> {req === "length" && "At least 8 characters"}
                      {req === "uppercase" && "One uppercase letter"}
                      {req === "lowercase" && "One lowercase letter"}
                      {req === "number" && "One number"}
                      {req === "special" && "One special character"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-bold text-sm mb-2 block">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm new password" 
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium border border-transparent dark:border-slate-700/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-800">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Check className="text-green-600 dark:text-green-400 w-8 h-8" />
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              You can now log in with your new password.
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link 
            href="/login" 
            className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
