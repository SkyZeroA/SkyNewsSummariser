"use client";

import { useState } from "react";
import { useConfig } from "@/app/providers";

interface Props {
  onSubscribe?: (email: string) => Promise<void> | void;
}

// Simple email validation helper kept at module scope
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());
const validate = (value: string) => {
  if (!value.trim()) {return "Email is required";}
  if (!isValidEmail(value)) {return "Enter a valid email address";}
  return null;
};

export default function SubscribeForm({ onSubscribe }: Props) {
  const { apiUrl } = useConfig();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setEmail(next);
    if (touched) {setError(validate(next));}
    setSuccess(null);
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validate(email));
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setTouched(true);
    const v = validate(email);
    setError(v);
    setSuccess(null);
    if (v) {return;}

    try {
      setLoading(true);
      const trimmed = email.trim();
      if (onSubscribe) {
        await onSubscribe(trimmed);
      } else {
        if (!apiUrl) {
          throw new Error('API URL not configured');
        }
        const url = `${apiUrl}subscribe`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Subscription failed');
        }
      }
      setSuccess("Check your email to confirm your subscription");
      setEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = Boolean(validate(email)) || loading;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="subscribe-email" className="sr-only">
              Email address
            </label>
            <input
              id="subscribe-email"
              name="email"
              type="email"
              value={email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your email address"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "subscribe-email-error" : undefined}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? "Subscribing…" : "Subscribe"}
          </button>
        </div>
        {error && (
          <p
            id="subscribe-email-error"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {success && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400" role="status">
            {success}
          </p>
        )}
      </div>
    </form>
  );
}