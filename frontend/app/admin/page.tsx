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

        // For local development, use mock data if API is localhost
        if (apiUrl.includes('localhost')) {
          console.log("Using mock data for local development");
          // Set mock summary data
          const mockSummary: ComprehensiveSummary = {
            id: "mock-summary-1",
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            summaryText: `Breaking News Summary - March 5, 2026

The Manchester United centre-back was found guilty of non-serious assault, resisting arrest and attempted bribery. He was originally found guilty in the weeks after the incident, but the conviction was quashed on appeal and a retrial granted. The case dragged on for years after the retrial was postponed four times. White House press secretary Karoline Leavitt raised it all the way back down in a briefing. She didn't rule out the use of ground troops but said they weren't part of the plan. There was no statement of intent to support a popular uprising but in Iran, nor was there a US movement to make it happen.

In other news, Donald Trump gets 'the last laugh' as US kills alleged Iranian assassination plotters. The operation was carried out by US special forces in coordination with international partners. This marks a significant escalation in tensions between the United States and Iran.

Why Europe is finally standing up to Donald Trump - a major shift in European foreign policy has been observed as leaders across the continent are taking a more assertive stance against US policies they disagree with.

The housing market continues to see volatility with the question 'Our house is worth £860,000 - what are pros and cons of equity release?' being asked by many homeowners looking for financial flexibility in retirement.

Congress votes to summon Pam Bondi over handling of Epstein files, marking another chapter in the ongoing scrutiny of how authorities handled the Jeffrey Epstein case.

In a shocking development, a Labour MP's wife says "I've seen nothing to suspect my husband" after China spying arrests, raising questions about security clearances and vetting procedures.

International tensions remain high as Ukraine peace talks could be postponed for 'a while' due to Iran war, according to World News sources.

In sports news, there's a hole in Starmer's story on Iran, according to Politics News analysis, suggesting inconsistencies in the Prime Minister's statements about the UK's position on the Iran situation.

Finally, Harry Maguire, Manchester United defender, has been sentenced over 2029 Mykonos incident in UK News, bringing closure to a long-running legal case.

The Iranian people were conspicuous in its absence from White House briefing on the US News front, raising questions about the administration's communication strategy regarding the conflict.`,
            sourceArticles: [
              {
                title: "More than 60 sick babies linked to toxic baby formula, says UK Health Security Agency | UK News | Sky News",
                url: "https://news.sky.com/story/more-than-60-sick-babies-linked-to-toxic-baby-formula-says-uk-health-security-agency-13287654"
              },
              {
                title: "Donald Trump gets 'the last laugh' as US kills alleged Iranian assassination plotters | US News | Sky News",
                url: "https://news.sky.com/story/donald-trump-gets-the-last-laugh-as-us-kills-alleged-iranian-assassination-plotters-13287123"
              },
              {
                title: "Why Europe is finally standing up to Donald Trump | US News | Sky News",
                url: "https://news.sky.com/story/why-europe-is-finally-standing-up-to-donald-trump-13286987"
              },
              {
                title: "'Our house is worth £860,000 - what are pros and cons of equity release?' | Money newsletter | Money News | Sky News",
                url: "https://news.sky.com/story/our-house-is-worth-860-000-what-are-pros-and-cons-of-equity-release-money-newsletter-money-news-sky-news-13287456"
              },
              {
                title: "Congress votes to summon Pam Bondi over handling of Epstein files",
                url: "https://news.sky.com/story/congress-votes-to-summon-pam-bondi-over-handling-of-epstein-files-13287234"
              },
              {
                title: "I've seen nothing to suspect my husband, says Labour MP after China spying arrests",
                url: "https://news.sky.com/story/ive-seen-nothing-to-suspect-my-husband-says-labour-mp-after-china-spying-arrests-13287567"
              },
              {
                title: "Ukraine peace talks could be postponed for 'a while' due to Iran war | World News | Sky News",
                url: "https://news.sky.com/story/ukraine-peace-talks-could-be-postponed-for-a-while-due-to-iran-war-13287890"
              },
              {
                title: "The hole in Starmer's story on Iran | Politics News | Sky News",
                url: "https://news.sky.com/story/the-hole-in-starmers-story-on-iran-13287345"
              },
              {
                title: "Harry Maguire, Manchester United defender sentenced over 2029 Mykonos incident | UK News | Sky News",
                url: "https://news.sky.com/story/harry-maguire-manchester-united-defender-sentenced-over-2029-mykonos-incident-13287123"
              },
              {
                title: "Talk of what comes next for the Iranian people was conspicuous in its absence from White House briefing | US News | Sky News",
                url: "https://news.sky.com/story/talk-of-what-comes-next-for-the-iranian-people-was-conspicuous-in-its-absence-from-white-house-briefing-13287678"
              }
            ]
          };
          setSummary(mockSummary);
          setEditedSummary(mockSummary.summaryText);
          setIsLoading(false);
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
            router.push("/login");
          }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router, apiUrl, fetchSummary]);

    // Publish handler
  const handlePublish = async () => {
    if (!apiUrl || !summary) {return;}
    try {
      const response = await fetch(`${apiUrl}publish-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          summaryText: editedSummary,
          sourceArticles: summary.sourceArticles,
        }),
      });
      if (response.ok) {
        console.log("Summary published successfully");
      } else {
        const data = await response.json().catch(() => ({}));
        console.error(data.error || "Failed to publish summary");
      }
    } catch (error) {
      console.error("Error publishing summary:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fadeIn">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading summary...</p>
        </div>
      </div>
    );
}  return (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Main Summary Editor */}
            <Card className="overflow-hidden animate-slideUp flex flex-col" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Comprehensive Summary
                </h2>
              </CardHeader>
              <CardBody className="px-6 py-6 flex-1 flex flex-col min-h-0">
                <div className="flex flex-col gap-6 flex-1 min-h-0">
                  <div className="animate-fadeIn flex-1 flex flex-col min-h-0" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    <Textarea
                      label="Summary Text"
                      placeholder="Edit the comprehensive summary..."
                      value={editedSummary}
                      onValueChange={setEditedSummary}
                      variant="bordered"
                      minRows={0}
                      maxRows={45}
                      classNames={{
                        base: "flex-1 flex flex-col min-h-0",
                        input: "text-gray-900 dark:text-white text-base leading-relaxed resize-none overflow-y-auto flex-1",
                        label: "text-gray-700 dark:text-gray-300 text-lg font-semibold",
                        inputWrapper: "transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 flex-1 flex flex-col min-h-0",
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
            <Card className="overflow-hidden animate-slideUp flex flex-col" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
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
              className="font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg px-8"
              onPress={handlePublish}
              disabled={isLoading}
            >
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
