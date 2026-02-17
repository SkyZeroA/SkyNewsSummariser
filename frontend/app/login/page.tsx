"use client";

import LoginForm from "@/components/LoginForm";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    // Call the authentication API
    // Important: include cookies in request
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Cookies are set automatically by the server
      // Dispatch custom event to notify header of login state change
      globalThis.dispatchEvent(new Event('auth-change'));

      // Redirect to admin dashboard
      router.push('/admin');
    } else {
      // Throw error with message from API
      throw new Error(data.error || 'Invalid credentials');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center animate-fadeIn">
        <h2 className="font-bold text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Administration Portal
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to access the admin dashboard
        </p>
      </div>

      <div className="animate-scaleIn" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <LoginForm onSubmit={handleLogin} />
      </div>
    </div>
  );
}

