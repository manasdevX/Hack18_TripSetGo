"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setMessage("Verification token is missing.");
        setIsError(true);
        return;
      }

      try {
        await axios.post(`${API_BASE_URL}/auth/verify-email?token=${token}`);
        setMessage("Email verified successfully. Redirecting to login...");

        setTimeout(() => {
          router.push("/login?message=email_verified");
        }, 2000);
      } catch (error) {
        setMessage(
          error.response?.data?.detail || "Email verification failed."
        );
        setIsError(true);
      }
    };

    verifyEmail();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {isError ? "Verification Failed" : "Email Verification"}
        </h1>
        <p className={`text-sm ${isError ? "text-red-600" : "text-slate-600"}`}>
          {message}
        </p>
      </div>
    </div>
  );
}