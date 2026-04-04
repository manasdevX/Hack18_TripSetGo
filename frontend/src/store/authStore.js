import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// Create Axios Instance
const API = axios.create({ 
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// ✨ PRO FEATURE: Request Interceptor
// Automatically attaches the JWT from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // --- States ---
      isAuthenticated: false,
      isEmailVerified: false,
      isHydrated: false, 
      user: null,
      isLoading: false,
      error: null,
      resetToken: null,  // Temporary token for password reset flow

      // --- Sync Helpers ---
      setHydrated: () => set({ isHydrated: true }),
      clearError: () => set({ error: null }),
      setVerification: (status) => set({ isEmailVerified: status }),

      // --- Actions ---

      // 1. Send OTP (Pre-registration)
      sendSignupOTP: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await API.post("/auth/send-signup-otp", { email });
          set({ isLoading: false });
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Failed to send OTP";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 2. Verify OTP
      verifySignupOTP: async (email, otpCode) => {
        set({ isLoading: true, error: null });
        try {
          await API.post("/auth/verify-signup-otp", { email, otp_code: otpCode });
          set({ isEmailVerified: true, isLoading: false });
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Invalid OTP";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 3. Final Signup
      signup: async (email, fullName, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/signup", { 
            email, 
            full_name: fullName, 
            password 
          });
          const { tokens, user } = res.data;
          
          localStorage.setItem("access_token", tokens.access_token);
          set({ 
            user, 
            isAuthenticated: true, 
            isEmailVerified: true, 
            isLoading: false 
          });
          return res.data;
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Signup failed";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 4. Standard Login
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/login", { email, password });
          const { tokens, user } = res.data;
          
          localStorage.setItem("access_token", tokens.access_token);
          set({ user, isAuthenticated: true, isLoading: false });
          return res.data;
        } catch (err) {
          // Note: 404s are handled by the component's catch block for redirect logic
          const errMsg = err.response?.data?.detail || "Login failed";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 5. Google OAuth Logic
      googleStart: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/google/start", { id_token: idToken });
          const data = res.data;
          
          if (data.status === "SUCCESS") {
            localStorage.setItem("access_token", data.tokens.access_token);
            set({ 
              user: data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            // This handles SIGNUP_REQUIRED - stops loading so UI can redirect
            set({ isLoading: false });
          }
          return data;
        } catch (err) {
          set({ error: "Google login failed", isLoading: false });
          throw err;
        }
      },

      // 6. Logout (Secure with Backend Call)
      logout: async () => {
        try {
          // Call backend logout endpoint
          await API.post("/auth/logout").catch(() => {}); // Ignore errors
        } finally {
          // Client-side cleanup (always execute)
          localStorage.removeItem("access_token");
          set({ 
            isAuthenticated: false, 
            user: null, 
            isEmailVerified: false,
            error: null,
            resetToken: null  // Clear any reset tokens
          });
          // Redirect to login
          window.location.href = "/login";
        }
      },

      // 7. Forgot Password - Stage 1 (Request OTP)
      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/forgot-password", { email });
          set({ isLoading: false });
          return res.data;
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Failed to send OTP";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 8. Verify Password OTP - Stage 2 (Verify OTP and get reset token)
      verifyPasswordOTP: async (email, otpCode) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/verify-password-otp", { 
            email, 
            otp_code: otpCode 
          });
          // Store reset token in memory (not localStorage for security)
          set({ isLoading: false, resetToken: res.data?.reset_token });
          return res.data;
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Invalid or expired OTP";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      },

      // 9. Reset Password - Stage 3 (Complete password reset)
      resetPassword: async (resetToken, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          const res = await API.post("/auth/reset-password", { 
            reset_token: resetToken, 
            new_password: newPassword 
          });
          set({ isLoading: false, resetToken: null });
          return res.data;
        } catch (err) {
          const errMsg = err.response?.data?.detail || "Failed to reset password";
          set({ error: errMsg, isLoading: false });
          throw err;
        }
      }
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // ✨ CRITICAL FOR HYDRATION
      onRehydrateStorage: () => (state) => {
        state.setHydrated(); 
      },
      // Only persist these keys to localStorage
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated, 
        user: state.user 
      })
    }
  )
);

// ✨ PRO FEATURE: Response Interceptor
// If any API call returns a 401 (Unauthorized), automatically log the user out
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);