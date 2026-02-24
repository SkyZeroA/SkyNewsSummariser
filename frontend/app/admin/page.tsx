"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Textarea, Link } from "@heroui/react";
import { ComprehensiveSummary } from "@/types/summary";
import { useConfig } from "@/app/providers";

export default function AdminDashboard() {
  const router = useRouter();
  const { apiUrl } = useConfig();
  const [summary, setSummary] = useState<ComprehensiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedSummary, setEditedSummary] = useState("");

  // Fetch the pending comprehensive summary from API
  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!apiUrl) {
        console.error("API URL not available");
        return;
      }
      // Important: include cookies in request
      const response = await fetch(`${apiUrl}draft-summary`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Get the daily summary if it's pending
        if (data.summary) {
          setSummary(data.summary);
          setEditedSummary(data.summary.summaryText);
        }
      } else {
        console.error("Failed to fetch summary");
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  // Check authorization on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify authentication via API (which checks cookies)
        // Important: include cookies in request
        if (!apiUrl) {
          console.error("API URL not available");
          return;
        }
          const response = await fetch(`${apiUrl}auth/verify`, {
            credentials: "include",
          });

          if (response.ok) {
            // User is authenticated - fetch summary
            fetchSummary();
          } else {
            // Not authenticated, redirect to login
            router.push("/login.html");
          }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login.html");
      }
    };

    checkAuth();
  }, [router, apiUrl, fetchSummary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fadeIn">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Summary Review
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and edit the AI-generated comprehensive summary before publishing to the website
        </p>
      </div>

      {summary ? (
        <div className="space-y-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Main Summary Editor */}
            <Card className="overflow-hidden animate-slideUp h-full flex flex-col" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Comprehensive Summary
                </h2>
              </CardHeader>
              <CardBody className="px-6 py-6 flex-1 flex flex-col">
                <div className="flex flex-col gap-6 flex-1">
                  <div className="animate-fadeIn flex-1 flex flex-col" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    <Textarea
                      label="Summary Text"
                      placeholder="Edit the comprehensive summary..."
                      value={editedSummary}
                      onValueChange={setEditedSummary}
                      variant="bordered"
                      minRows={0}
                      maxRows={20}
                      classNames={{
                        base: "flex-1",
                        input: "text-gray-900 dark:text-white text-base leading-relaxed overflow-hidden resize-none",
                        label: "text-gray-700 dark:text-gray-300 text-lg font-semibold",
                        inputWrapper: "transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 h-full min-h-[600px]",
                      }}
                    />
                  </div>

                  {editedSummary !== summary.summaryText && (
                    <Button
                      color="primary"
                      variant="flat"
                      size="md"
                      className="animate-slideUp transition-all duration-300 hover:scale-105 self-start"
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Source Articles */}
            <Card className="overflow-hidden animate-slideUp h-full flex flex-col" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Source Articles ({summary.sourceArticles.length})
                </h2>
              </CardHeader>
              <CardBody className="px-6 py-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {summary.sourceArticles.map((article, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 animate-fadeIn"
                      style={{ animationDelay: `${0.4 + index * 0.05}s`, animationFillMode: 'both' }}
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {article.title}
                      </h3>
                      <Link
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-300"
                      >
                        View Article →
                      </Link>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center animate-fadeIn" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            <Button
              color="success"
              size="lg"
              className="font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg px-8"            >
              Publish
            </Button>
          </div>
        </div>
      ) : (
        <Card className="animate-scaleIn">
          <CardBody className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No pending summary to review
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
