"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { googleCallback } = useAuthStore();

  useEffect(() => {
    const token =
      searchParams.get("token") || searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) {
      router.push(`/login?error=${error}`);
      return;
    }

    if (!token) {
      router.push("/login?error=google_failed");
      return;
    }

    localStorage.setItem("access_token", token);

    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }

    googleCallback(token)
      .then(() => {
        router.push("/dashboard");
      })
      .catch(() => {
        router.push("/login?error=google_failed");
      });
  }, [router, searchParams, googleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Signing you in with Google...</p>
      </div>
    </div>
  );
}