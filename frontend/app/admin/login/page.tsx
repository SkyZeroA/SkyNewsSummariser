"use client";

import LoginForm from "@/components/LoginForm";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const handleLogin = async (email: string, _password: string) => {
    // NOTE: Implement actual authentication logic
    // For now, this is a placeholder that simulates authentication
    console.log("Admin login attempt:", { email, password: "***" });

    // Simulate API call delay
    // eslint-disable-next-line promise/avoid-new
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    // NOTE: Replace with actual authentication
    // Example: Call your backend API
    // Const response = await fetch('/api/auth/login', {
    //   Method: 'POST',
    //   Headers: { 'Content-Type': 'application/json' },
    //   Body: JSON.stringify({ email, password })
    // });

    // If (response.ok) {
    //   Const data = await response.json();
    //   Store token/session
    //   LocalStorage.setItem('authToken', data.token);
    //   Router.push('/admin/dashboard');
    // } else {
    //   Throw new Error('Invalid credentials');
    // }

    // For demonstration purposes, accept any credentials
    alert(`Login successful for ${email}`);

    // Uncomment when you have an admin dashboard
    // Router.push('/admin/dashboard');

    // Prevent unused variable warning
    void router;
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

