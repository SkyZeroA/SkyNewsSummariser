"use client";

import LoginForm from "@/components/LoginForm";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    // Call the authentication API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store token/session
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to admin dashboard
      router.push('/admin');
    } else {
      // Throw error with message from API
      throw new Error(data.error || 'Invalid credentials');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h2 className="font-bold text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Administration Portal
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to access the admin dashboard
        </p>
      </div>

      <LoginForm onSubmit={handleLogin} />
    </div>
  );
}

