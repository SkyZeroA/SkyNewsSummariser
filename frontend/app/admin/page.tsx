"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  // Check authorization on mount
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem("authToken");

      if (authToken) {
        // Token found, user is authorized - do nothing, stay on page
      } else {
        // No token found, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your Sky News Summariser content and settings
        </p>
      </div>

    </div>
  );
}
