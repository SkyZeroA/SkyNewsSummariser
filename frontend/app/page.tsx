"use client";

import { useState } from "react";
import { Input, Button } from "@heroui/react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Email validation - accepts any domain email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      // eslint-disable-next-line promise/avoid-new
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000);
      });
      setSuccess("Successfully subscribed to news summaries!");
      setEmail("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Subscription failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          News Summary
        </h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            In major global developments, world leaders have reached a historic
            climate agreement at the Global Climate Summit in Geneva, with 195
            countries committing to achieve net zero emissions by 2045. The
            landmark deal includes $500 billion in climate finance from developed
            nations to support clean energy transitions in developing countries.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            In technology news, a leading tech company has unveiled a revolutionary
            AI assistant featuring advanced natural language processing and smart
            home integration capabilities. While the innovation promises to transform
            daily technology interactions, privacy advocates have raised concerns
            about data collection practices. The product launches next month in
            select markets.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            On the local front, community members have rallied to save the historic
            Palace Theatre from demolition, raising over $2 million through grassroots
            efforts. The 100-year-old cultural landmark faces replacement by commercial
            development, with a town hall meeting scheduled next week to discuss
            preservation options.
          </p>
        </div>
      </article>

      {/* Email Subscription Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Subscribe to News Summaries
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Get the latest news summaries delivered directly to your inbox.
        </p>

        <form onSubmit={handleSubscribe} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email Address"
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

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              {success}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-semibold"
          >
            {isLoading ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
