"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Input, Textarea, Link } from "@heroui/react";
import { Summary } from "@/types/summary";

export default function AdminDashboard() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedSummary, setEditedSummary] = useState("");

  // Check authorization on mount
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem("authToken");

      if (authToken) {
        // Token found, user is authorized - fetch summaries
        fetchSummaries();
      } else {
        // No token found, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch summaries from API
  const fetchSummaries = async () => {
    try {
      setIsLoading(true);
      const authToken = localStorage.getItem("authToken");
      const response = await fetch("/api/summaries?status=pending", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries);
        // Auto-select the first summary
        if (data.summaries.length > 0) {
          selectSummary(data.summaries[0]);
        }
      } else {
        console.error("Failed to fetch summaries");
      }
    } catch (error) {
      console.error("Error fetching summaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Select a summary for editing
  const selectSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setEditedTitle(summary.articleTitle);
    setEditedSummary(summary.summaryText);
  };

  // Update summary content
  const handleUpdateSummary = async () => {
    if (!selectedSummary) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/summaries/${selectedSummary.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleTitle: editedTitle,
          summaryText: editedSummary,
        }),
      });

      if (response.ok) {
        const updatedSummary = await response.json();
        // Update the summary in the list
        setSummaries((prev) =>
          prev.map((s) => (s.id === updatedSummary.id ? updatedSummary : s))
        );
        setSelectedSummary(updatedSummary);
      }
    } catch (error) {
      console.error("Error updating summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Approve summary
  const handleApprove = async () => {
    if (!selectedSummary) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/summaries/${selectedSummary.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (response.ok) {
        // Remove from pending list
        const remainingSummaries = summaries.filter((s) => s.id !== selectedSummary.id);
        setSummaries(remainingSummaries);

        // Select next summary or clear selection
        if (remainingSummaries.length > 0) {
          selectSummary(remainingSummaries[0]);
        } else {
          setSelectedSummary(null);
          setEditedTitle("");
          setEditedSummary("");
        }
      }
    } catch (error) {
      console.error("Error approving summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reject summary
  const handleReject = async () => {
    if (!selectedSummary) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/summaries/${selectedSummary.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (response.ok) {
        // Remove from pending list
        const remainingSummaries = summaries.filter((s) => s.id !== selectedSummary.id);
        setSummaries(remainingSummaries);

        // Select next summary or clear selection
        if (remainingSummaries.length > 0) {
          selectSummary(remainingSummaries[0]);
        } else {
          setSelectedSummary(null);
          setEditedTitle("");
          setEditedSummary("");
        }
      }
    } catch (error) {
      console.error("Error rejecting summary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading summaries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Summary Review
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and edit AI-generated summaries before sending to subscribers
        </p>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No pending summaries to review
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
          {/* Left Panel - Summary List */}
          <Card className="overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pending Summaries ({summaries.length})
              </h2>
            </CardHeader>
            <CardBody className="px-0 py-0 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {summaries.map((summary) => (
                  <button
                    key={summary.id}
                    onClick={() => selectSummary(summary)}
                    className={`w-full text-left px-6 py-4 transition-colors ${
                      selectedSummary?.id === summary.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent"
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {summary.articleTitle}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {summary.summaryText}
                    </p>
                    <Link
                      href={summary.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Source →
                    </Link>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Right Panel - Edit Summary */}
          <Card className="overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Summary
              </h2>
            </CardHeader>
            <CardBody className="px-6 py-6 overflow-y-auto">
              {selectedSummary ? (
                <div className="flex flex-col gap-6 h-full">
                  <Input
                    label="Article Title"
                    placeholder="Enter article title"
                    value={editedTitle}
                    onValueChange={setEditedTitle}
                    variant="bordered"
                    classNames={{
                      input: "text-gray-900 dark:text-white",
                      label: "text-gray-700 dark:text-gray-300",
                    }}
                  />

                  <Textarea
                    label="AI-Generated Summary"
                    placeholder="Enter summary text"
                    value={editedSummary}
                    onValueChange={setEditedSummary}
                    variant="bordered"
                    minRows={12}
                    classNames={{
                      input: "text-gray-900 dark:text-white",
                      label: "text-gray-700 dark:text-gray-300",
                    }}
                  />

                  <div className="flex-1"></div>

                  <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      color="success"
                      size="lg"
                      className="flex-1 font-semibold"
                      onPress={handleApprove}
                      isLoading={isSaving}
                    >
                      Approve
                    </Button>
                    <Button
                      color="danger"
                      size="lg"
                      variant="flat"
                      className="flex-1 font-semibold"
                      onPress={handleReject}
                      isLoading={isSaving}
                    >
                      Reject
                    </Button>
                  </div>

                  {(editedTitle !== selectedSummary.articleTitle ||
                    editedSummary !== selectedSummary.summaryText) && (
                    <Button
                      color="primary"
                      variant="flat"
                      size="sm"
                      onPress={handleUpdateSummary}
                      isLoading={isSaving}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a summary to edit
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
