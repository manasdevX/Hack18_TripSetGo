import { create } from "zustand";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useSubscriptionStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────────
  subscription: null,   // Full status from backend
  isLoading: false,
  error: null,

  // ── Actions ──────────────────────────────────────────────────

  /** Fetch current subscription status + usage */
  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.get("/subscription/status");
      set({ subscription: res.data, isLoading: false });
    } catch (err) {
      const status = err.response?.status;
      // Silently ignore 401/403 — user is not logged in yet (public pages)
      if (status === 401 || status === 403) {
        set({ isLoading: false });
        return;
      }
      set({
        error: err.response?.data?.detail || "Failed to load subscription",
        isLoading: false,
      });
    }
  },


  /** Create a Razorpay order and open the checkout */
  initiatePayment: async (plan, onSuccess, onError) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.post("/subscription/create-order", { plan });
      const { order_id, amount, currency, key } = res.data;
      set({ isLoading: false });

      const options = {
        key,
        amount,
        currency,
        order_id,
        name: "TripSetGo",
        description: plan === "PRO_MONTHLY" ? "Pro Monthly Plan" : "Pro Yearly Plan",
        theme: { color: "#6366f1" },
        handler: async (response) => {
          // ✅ Backend verifies the signature — never trust frontend alone
          await get().verifyPayment(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature,
            plan,
            onSuccess,
            onError
          );
        },
        modal: {
          ondismiss: () => set({ isLoading: false }),
        },
      };

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection and disable any ad blockers, then try again.");
      }
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      let msg;
      if (status === 503) {
        msg = "⚙️ Razorpay is not configured yet. Add your API keys to backend/.env to enable payments.";
      } else if (status === 401) {
        msg = "🔑 Razorpay key mismatch. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env match your dashboard.";
      } else {
        msg = detail || err.message || "Payment initiation failed. Please try again.";
      }

      set({ error: msg, isLoading: false });
      if (onError) onError(msg);
    }
  },


  /** Verify payment with backend after Razorpay callback */
  verifyPayment: async (
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    plan,
    onSuccess,
    onError
  ) => {
    set({ isLoading: true });
    try {
      const res = await API.post("/subscription/verify", {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        plan,
      });
      // Refresh subscription state
      await get().fetchStatus();
      set({ isLoading: false });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Payment verification failed";
      set({ error: msg, isLoading: false });
      if (onError) onError(msg);
    }
  },

  clearError: () => set({ error: null }),
}));
