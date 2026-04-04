"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, RefreshCcw } from "lucide-react";
import { authAPI } from "../../services/api";

function VerifyOTPContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Please enter all 6 digits");
    
    setIsLoading(true);
    setError("");
    try {
      const res = await authAPI.verifyOtp(email, otp);
      // Backend returns tokens upon successful OTP verification
      localStorage.setItem("access_token", res.data.tokens.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.resendOtp(email);
      alert("New code sent to your email!");
    } catch (err) {
      setError("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
        <div className="inline-block p-4 bg-emerald-100 rounded-full mb-6">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
        <p className="text-slate-500 mb-8 text-sm">
          We sent a 6-digit code to <br/><b className="text-slate-800">{email}</b>
        </p>
        
        <form onSubmit={handleVerify}>
          <input 
            type="text"
            maxLength="6"
            className="w-full text-center text-3xl tracking-[0.5em] font-bold p-4 bg-slate-50 border-2 border-dashed rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition mb-4"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            disabled={isLoading}
          />
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition flex items-center justify-center gap-2"
          >
            {isLoading ? "Verifying..." : "Verify & Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button 
          onClick={handleResend}
          disabled={isResending}
          className="mt-6 text-sm text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2 w-full transition"
        >
          <RefreshCcw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
          {isResending ? "Sending..." : "Didn't get a code? Resend"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}