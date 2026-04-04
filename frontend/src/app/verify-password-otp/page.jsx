"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, AlertCircle, Loader2, Clock } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Link from "next/link";

export default function VerifyPasswordOTPPage() {
  const router = useRouter();
  const { 
    verifyPasswordOTP, 
    forgotPassword,
    isLoading, 
    error: storeError, 
    clearError, 
    isAuthenticated, 
    isHydrated 
  } = useAuthStore();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [localError, setLocalError] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [resendAvailable, setResendAvailable] = useState(false);
  const inputRefs = useRef([]);
  const email = typeof window !== "undefined" ? sessionStorage.getItem("password_recovery_email") : "";

  useEffect(() => {
    useAuthStore.setState({ isLoading: false, error: null });
    clearError?.();
  }, [clearError]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  // Redirect to forgot-password if no email in session
  useEffect(() => {
    if (!email) {
      router.push("/forgot-password");
    }
  }, [email, router]);

  // Timer for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) {
      setResendAvailable(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    
    // Only allow digits
    if (!(value === "" || /^[0-9]$/.test(value))) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setLocalError("Please enter all 6 digits");
      return;
    }

    try {
      // Call auth store's verify OTP method
      const result = await verifyPasswordOTP(email, otpCode);
      
      // Store reset token and verification flag in session
      sessionStorage.setItem("reset_token", result.reset_token);
      sessionStorage.setItem("otp_verified", "true");
      
      // Redirect to reset password page
      router.push("/reset-password");
    } catch (err) {
      setLocalError(storeError || "Invalid OTP");
      // Clear wrong OTP
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      // Call forgot-password endpoint again through auth store
      await forgotPassword(email);

      // Reset timer
      setTimeLeft(300);
      setResendAvailable(false);
      setLocalError("");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setLocalError("Failed to resend OTP");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Verify OTP</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            Enter the 6-digit code sent to<br />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input Fields */}
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-14 bg-slate-50 dark:bg-slate-800/50 dark:text-white text-center text-2xl font-black rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
                placeholder="0"
                disabled={isLoading}
                required
              />
            ))}
          </div>

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

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 font-medium text-sm">
            <Clock size={16} />
            {resendAvailable ? (
              <span className="text-orange-600 dark:text-orange-400 font-bold">Code expired</span>
            ) : (
              <span>OTP expires in {formatTime(timeLeft)}</span>
            )}
          </div>

          {/* Verify Button */}
          <button 
            type="submit"
            disabled={isLoading || otp.some(d => !d)}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            {resendAvailable ? (
              <button
                type="button"
                onClick={handleResend}
                className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
              >
                Resend OTP
              </button>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Didn't receive the code?{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  Resend in {formatTime(timeLeft)}
                </span>
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link 
            href="/forgot-password" 
            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <Link 
            href="/login" 
            className="text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
