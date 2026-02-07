import { NextRequest, NextResponse } from "next/server";
import { Summary } from "@/types/summary";

// Mock data for summaries - in production, this would come from a database
const MOCK_SUMMARIES: Summary[] = [
  {
    id: "1",
    articleTitle: "Breaking: Major Climate Agreement Reached at Global Summit",
    articleUrl: "https://news.sky.com/story/climate-agreement-2024",
    summaryText: "World leaders have reached a historic climate agreement at the Global Climate Summit in Geneva. The agreement includes commitments to reduce carbon emissions by 50% by 2030 and achieve net-zero by 2050. Over 150 countries have signed the accord, marking a significant step forward in global climate action.",
    status: "pending",
    createdAt: "2026-02-07T10:30:00Z",
    updatedAt: "2026-02-07T10:30:00Z",
  },
  {
    id: "2",
    articleTitle: "Tech Innovation: New AI Assistant Unveiled by Leading Company",
    articleUrl: "https://news.sky.com/story/ai-assistant-2024",
    summaryText: "A major technology company has unveiled its latest AI assistant, featuring advanced natural language processing and real-time translation capabilities. The assistant can understand context, learn user preferences, and integrate seamlessly with smart home devices. Industry experts predict this could revolutionize how we interact with technology.",
    status: "pending",
    createdAt: "2026-02-07T09:15:00Z",
    updatedAt: "2026-02-07T09:15:00Z",
  },
  {
    id: "3",
    articleTitle: "Local Community Saves Historic Theatre from Demolition",
    articleUrl: "https://news.sky.com/story/theatre-saved-2024",
    summaryText: "A grassroots campaign has successfully saved a 100-year-old theatre from demolition. The community raised £2 million in just six months to purchase and restore the building. The theatre, which has hosted countless performances over the decades, will reopen next year with a modern renovation while preserving its historic charm.",
    status: "pending",
    createdAt: "2026-02-07T08:45:00Z",
    updatedAt: "2026-02-07T08:45:00Z",
  },
  {
    id: "4",
    articleTitle: "Economic Growth Exceeds Expectations in Q4 Report",
    articleUrl: "https://news.sky.com/story/economy-q4-2024",
    summaryText: "The latest economic report shows GDP growth of 3.2% in Q4, surpassing analyst predictions of 2.5%. Strong consumer spending and business investment drove the growth, while unemployment fell to a 10-year low. Economists are optimistic about continued growth in the coming year.",
    status: "pending",
    createdAt: "2026-02-07T07:20:00Z",
    updatedAt: "2026-02-07T07:20:00Z",
  },
];

// GET endpoint to fetch all summaries
export const GET = (request: NextRequest) => {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Filter summaries by status if provided
    let filteredSummaries = MOCK_SUMMARIES;
    if (status && (status === "pending" || status === "approved" || status === "rejected")) {
      filteredSummaries = MOCK_SUMMARIES.filter((s) => s.status === status);
    }

    return NextResponse.json(
      {
        summaries: filteredSummaries,
        count: filteredSummaries.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching summaries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

