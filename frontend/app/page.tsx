"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardBody, Input, Link } from "@heroui/react";
import { ComprehensiveSummary } from "@/types/summary";

export default function Home() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [approvedSummary, setApprovedSummary] = useState<ComprehensiveSummary | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(true);

  // Fetch approved summary on mount
  useEffect(() => {
    const fetchApprovedSummary = async () => {
      try {
        setIsFetchingSummary(true);
        const response = await fetch("/api/summaries?status=approved");

        if (response.ok) {
          const data = await response.json();
          // Get the most recent approved summary
          if (data.summaries.length > 0) {
            setApprovedSummary(data.summaries[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching approved summary:", error);
      } finally {
        setIsFetchingSummary(false);
      }
    };

    fetchApprovedSummary();
  }, []);

  // Clear messages when user starts typing
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error || success) {
      setError("");
      setSuccess("");
    }
  };

  const handleSubscribe = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Basic validation
    if (!email) {
      setError("Please enter your email address");
      return;
    }

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

  // Sample data for summarised articles
  const summarisedArticles = [
    {
      id: 1,
      image: "/placeholder-1.jpg",
      title: "UK 'rapidly developing' plans to respond for war, says defence minister",
    },
    {
      id: 2,
      image: "/placeholder-2.jpg",
      title: "Economisation of cost ballast with hiring has announced vehicle hits with a slowing",
    },
    {
      id: 3,
      image: "/placeholder-3.jpg",
      title: "British backpacker jailed after being caught with half a tonne of fish",
    },
    {
      id: 4,
      image: "/placeholder-4.jpg",
      title: "Last three postage stamps scrapped, new product takes place in Ukraine",
    },
  ];



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Summary Section */}
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-lg p-8 mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold mb-6 uppercase tracking-wide">
          Summary
        </h1>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-3">Yesterday's News</h2>

          {isFetchingSummary && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!isFetchingSummary && approvedSummary && (
            <div className="space-y-4">
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed animate-slideUp">
                {approvedSummary.summaryText}
              </div>

              {/* Source Articles Links */}
              {approvedSummary.sourceArticles.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Source Articles:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {approvedSummary.sourceArticles.map((article, index) => (
                      <Link
                        key={index}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-300"
                      >
                        {article.title} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isFetchingSummary && !approvedSummary && (
            <p className="text-gray-600 dark:text-gray-400 py-4">
              No summary available yet. Check back later!
            </p>
          )}
        </div>
      </section>

      {/* Summarised Articles Section */}
      <section className="mb-8 animate-fadeIn" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wide">
          Summarised Articles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summarisedArticles.map((article, index) => (
            <Card
              key={article.id}
              isPressable
              onPress={() => console.log(`Clicked article: ${article.title}`)}
              className="overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 animate-scaleIn"
              style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'both' }}
            >
              <CardBody className="p-0">
                <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 transition-transform duration-300 hover:scale-110">
                    Image placeholder
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                    {article.title}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Email Subscription Section */}
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-lg p-8 mb-8 animate-fadeIn" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Want this delivered daily?
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Enter your email address to receive a summary of yesterdays news in your inbox every morning
          </p>
        </div>

        <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onValueChange={handleEmailChange}
                isRequired
                variant="flat"
                classNames={{
                  input: "text-gray-900 dark:text-white",
                  inputWrapper: "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500",
                }}
              />
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded h-10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Subscribe
            </Button>
          </div>

          {error && !success && (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded animate-slideUp">
              {error}
            </div>
          )}

          {success && !error && (
            <div className="mt-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded animate-slideUp">
              {success}
            </div>
          )}
        </form>
      </section>


    </div>
  );
}
