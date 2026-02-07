import { NextRequest, NextResponse } from "next/server";
import { Summary, SummaryUpdateRequest, SummaryActionRequest } from "@/types/summary";

// Mock data storage - in production, this would be a database
const summariesStore = new Map<string, Summary>([
  ["1", {
    id: "1",
    articleTitle: "Breaking: Major Climate Agreement Reached at Global Summit",
    articleUrl: "https://news.sky.com/story/climate-agreement-2024",
    summaryText: "World leaders have reached a historic climate agreement at the Global Climate Summit in Geneva. The agreement includes commitments to reduce carbon emissions by 50% by 2030 and achieve net-zero by 2050. Over 150 countries have signed the accord, marking a significant step forward in global climate action.",
    status: "pending",
    createdAt: "2026-02-07T10:30:00Z",
    updatedAt: "2026-02-07T10:30:00Z",
  }],
  ["2", {
    id: "2",
    articleTitle: "Tech Innovation: New AI Assistant Unveiled by Leading Company",
    articleUrl: "https://news.sky.com/story/ai-assistant-2024",
    summaryText: "A major technology company has unveiled its latest AI assistant, featuring advanced natural language processing and real-time translation capabilities. The assistant can understand context, learn user preferences, and integrate seamlessly with smart home devices. Industry experts predict this could revolutionize how we interact with technology.",
    status: "pending",
    createdAt: "2026-02-07T09:15:00Z",
    updatedAt: "2026-02-07T09:15:00Z",
  }],
  ["3", {
    id: "3",
    articleTitle: "Local Community Saves Historic Theatre from Demolition",
    articleUrl: "https://news.sky.com/story/theatre-saved-2024",
    summaryText: "A grassroots campaign has successfully saved a 100-year-old theatre from demolition. The community raised £2 million in just six months to purchase and restore the building. The theatre, which has hosted countless performances over the decades, will reopen next year with a modern renovation while preserving its historic charm.",
    status: "pending",
    createdAt: "2026-02-07T08:45:00Z",
    updatedAt: "2026-02-07T08:45:00Z",
  }],
  ["4", {
    id: "4",
    articleTitle: "Economic Growth Exceeds Expectations in Q4 Report",
    articleUrl: "https://news.sky.com/story/economy-q4-2024",
    summaryText: "The latest economic report shows GDP growth of 3.2% in Q4, surpassing analyst predictions of 2.5%. Strong consumer spending and business investment drove the growth, while unemployment fell to a 10-year low. Economists are optimistic about continued growth in the coming year.",
    status: "pending",
    createdAt: "2026-02-07T07:20:00Z",
    updatedAt: "2026-02-07T07:20:00Z",
  }],
]);

// GET endpoint to fetch a single summary
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const summary = summariesStore.get(id);

    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// PATCH endpoint to update summary content
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body: SummaryUpdateRequest = await request.json();

    const summary = summariesStore.get(id);
    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      );
    }

    // Update the summary
    const updatedSummary: Summary = {
      ...summary,
      articleTitle: body.articleTitle,
      summaryText: body.summaryText,
      updatedAt: new Date().toISOString(),
    };

    summariesStore.set(id, updatedSummary);

    return NextResponse.json(updatedSummary, { status: 200 });
  } catch (error) {
    console.error("Error updating summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// POST endpoint to approve or reject a summary
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body: SummaryActionRequest = await request.json();

    const summary = summariesStore.get(id);
    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      );
    }

    // Update the status
    const updatedSummary: Summary = {
      ...summary,
      status: body.action === "approve" ? "approved" : "rejected",
      updatedAt: new Date().toISOString(),
    };

    summariesStore.set(id, updatedSummary);

    return NextResponse.json(
      {
        success: true,
        summary: updatedSummary,
        message: `Summary ${body.action}d successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating summary status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

