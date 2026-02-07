"use client";

import { useState } from "react";
import { Input, Button, Card, CardBody, CardHeader } from "@heroui/react";

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void | Promise<void>;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    // Email validation - only @sky.uk emails allowed
    const emailRegex = /^[^\s@]+@sky\.uk$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid @sky.uk email address");
      return;
    }

    // Password validation - at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character");
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(email, password);
      } else {
        // Default behavior - log to console
        console.log("Login attempt:", { email, password: "***" });
        // Simulate API call delay
        // eslint-disable-next-line promise/avoid-new
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Login
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your credentials to access the admin panel
        </p>
      </CardHeader>
      <CardBody className="px-6 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onValueChange={setEmail}
            isRequired
            variant="bordered"
            classNames={{
              input: "text-gray-900 dark:text-white",
              label: "text-gray-700 dark:text-gray-300",
            }}
          />
          
          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onValueChange={setPassword}
            isRequired
            variant="bordered"
            classNames={{
              input: "text-gray-900 dark:text-white",
              label: "text-gray-700 dark:text-gray-300",
            }}
          />

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-semibold"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <a
              href="#"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

