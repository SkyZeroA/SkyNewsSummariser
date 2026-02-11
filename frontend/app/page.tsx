"use client";

import { useState } from "react";
import { Button, Card, CardBody, Input } from "@heroui/react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Sample data for most read articles
  const mostReadArticles = [
    "UK 'rapidly developing' plans to respond for war, says defence minister",
    "Trump hints US could defend Ukraine meeting this week in Oval Office discussion",
    "Man found guilty of savage pass bottle train attack",
    "People are discovering 'daily' farm asylum bubble says whistleblower",
    "Christine tree chopped down hours after lights switch on",
    "Interest rates cut chances and value of pound impacted after inflation rises",
    "What is 'spoofing'? How the oil tanker seized by US tried to evade sanctions",
    "Inside one of the most controversial darts in land of anger and confusion",
    "Friday's national newspaper front pages",
    "More bad news for chancellor as UK economy shrinks again",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Summary Section */}
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-lg p-8 mb-8">
        <h1 className="text-3xl font-bold mb-6 uppercase tracking-wide">
          Summary
        </h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-3">Yesterdays News</h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>
                The NHS is under severe winter pressure as a mutated "super flu" drives record hospital admissions,
                with doctors warning the health service is "on the brink" of being overwhelmed by the surge in cases.
              </li>
              <li>
                The Bank of England unexpectedly pauses its October, increasing expectations that the Bank of England will
                cut interest rates soon after the end of the year, with economists now predicting a 0.25% reduction in February.
              </li>
              <li>
                Police are investigating after learning bags of stolen items were stolen from a UK museum,
                including irreplaceable ancient artifacts dating back thousands of years, with the museum's security
                procedures now under review.
              </li>
              <li>
                A major UK retailer has announced plans to close 50 stores nationwide, citing rising global tensions
                and increased online activity.
              </li>
              <li>
                A National UK firm has been fined £5m delayed its financial results due to an ongoing accounting probe while
                the company's shares plunged 13% offering some relief to the sector.
              </li>
              <li>
                Transport officials are urging the rollout of a major new national rail timetable this weekend,
                despite warnings of "friendly disruption" on some routes.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Summarised Articles Section */}
      <section className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wide">
          Summarised Articles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summarisedArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardBody className="p-0">
                <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
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
      <section className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-lg p-8 mb-8">
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
                onValueChange={setEmail}
                isRequired
                variant="flat"
                classNames={{
                  input: "text-gray-900 dark:text-white",
                  inputWrapper: "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700",
                }}
              />
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded h-10"
            >
              Subscribe
            </Button>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded">
              {success}
            </div>
          )}
        </form>
      </section>

      {/* Most Read Section */}
      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wide">
          Most Read
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mostReadArticles.map((article, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  {article}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
