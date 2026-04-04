import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Handle Global Errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expires, wipe storage and boot to login
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.clear();
      window.location.href = "/login?session=expired";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // --- INLINE SIGNUP FLOW ---
  
  // Step 1: Send OTP (No user created yet)
  sendSignupOTP: (email) => apiClient.post("/auth/send-signup-otp", { email }),

  // Step 2: Verify OTP
  verifySignupOTP: (email, otp_code) => 
    apiClient.post("/auth/verify-signup-otp", { email, otp_code }),

  // Step 3: Final Signup (User created in DB)
  signup: (data) => apiClient.post("/auth/signup", data),

  // --- LOGIN & GOOGLE ---
  
  login: (email, password) => apiClient.post("/auth/login", { email, password }),

  googleStart: (id_token) => apiClient.post("/auth/google/start", { id_token }),

  // --- UTILS ---
  
  resendOtp: (email) => apiClient.post("/auth/resend-otp", { email }),

  getProfile: () => apiClient.get("/auth/me"),
  
  logout: () => {
    localStorage.clear();
    // We don't necessarily need a backend call for JWT logout, but good for logs
    return apiClient.post("/auth/logout").catch(() => {});
  }
};

export const tripAPI = {
  getTrips: () => apiClient.get("/trips"),
  createTrip: (data) => apiClient.post("/trips", data),
};

export default apiClient;