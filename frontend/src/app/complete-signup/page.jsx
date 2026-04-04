"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { authAPI } from "../../services/api";

export default function CompleteSignup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("signup_token");
    const storedEmail = sessionStorage.getItem("google_email");
    const storedName = sessionStorage.getItem("google_full_name");

    if (!token) {
      router.push("/login");
      return;
    }

    setEmail(storedEmail || "");
    setName(storedName || "");
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Frontend validation to avoid unnecessary API calls
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    const signup_token = sessionStorage.getItem("signup_token");
    
    try {
      await authAPI.completeGoogleSignup({ signup_token, password });
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const detail = err.response?.data?.detail;

      // CRASH FIX: Check if detail is an array (Pydantic validation error)
      if (Array.isArray(detail)) {
        setError(detail[0].msg); // Extract just the message string
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Completion failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Complete your profile</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Welcome <span className="font-bold text-indigo-600">{name}</span>! 
          Please create a password for your TripSetGo account.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 ml-1">Email (Verified via Google)</label>
            <input 
              type="text" 
              value={email} 
              disabled 
              className="w-full p-3 bg-slate-100 rounded-xl text-slate-500 cursor-not-allowed border border-slate-200" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 ml-1">Set Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="Minimum 8 characters" 
                className={`w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none transition ${
                  error ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:ring-indigo-500'
                }`} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? "Finalizing..." : "Finish & Verify Email"}
          </button>
        </div>
      </form>
    </div>
  );
}