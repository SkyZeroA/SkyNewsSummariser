import { NextRequest, NextResponse } from "next/server";
import { ComprehensiveSummary, ComprehensiveSummaryUpdateRequest, SummaryActionRequest } from "@/types/summary";

// Mock data storage - in production, this would be a database
const summariesStore = new Map<string, ComprehensiveSummary>([
  ["1", {
    id: "1",
    summaryText: `Yesterday's top news stories covered a range of significant developments across politics, technology, and society.

World leaders reached a historic climate agreement at the Global Climate Summit in Geneva, with commitments to reduce carbon emissions by 50% by 2030 and achieve net-zero by 2050. Over 150 countries have signed the accord, marking a significant step forward in global climate action.

In the technology sector, a major company unveiled its latest AI assistant featuring advanced natural language processing and real-time translation capabilities. The assistant can understand context, learn user preferences, and integrate seamlessly with smart home devices. Industry experts predict this could revolutionize how we interact with technology.

On the local front, a grassroots campaign successfully saved a 100-year-old theatre from demolition. The community raised £2 million in just six months to purchase and restore the building. The theatre will reopen next year with modern renovations while preserving its historic charm.

Economic news was positive, with the latest report showing GDP growth of 3.2% in Q4, surpassing analyst predictions of 2.5%. Strong consumer spending and business investment drove the growth, while unemployment fell to a 10-year low. Economists remain optimistic about continued growth in the coming year.`,
    sourceArticles: [
      {
        title: "Breaking: Major Climate Agreement Reached at Global Summit",
        url: "https://news.sky.com/story/climate-agreement-2024",
      },
      {
        title: "Tech Innovation: New AI Assistant Unveiled by Leading Company",
        url: "https://news.sky.com/story/ai-assistant-2024",
      },
      {
        title: "Local Community Saves Historic Theatre from Demolition",
        url: "https://news.sky.com/story/theatre-saved-2024",
      },
      {
        title: "Economic Growth Exceeds Expectations in Q4 Report",
        url: "https://news.sky.com/story/economy-q4-2024",
      },
    ],
    status: "pending",
    createdAt: "2026-02-16T10:30:00Z",
    updatedAt: "2026-02-16T10:30:00Z",
  }],
  ["2", {
    id: "2",
    summaryText: `Yesterday's news highlighted several important stories from across the UK and around the world.

The NHS is under severe winter pressure as a mutated "super flu" drives record hospital admissions, with doctors warning the health service is "on the brink" of being overwhelmed by the surge in cases.

The Bank of England unexpectedly held interest rates steady in October, increasing expectations that the Bank will cut rates soon after the end of the year, with economists now predicting a 0.25% reduction in February.

Police are investigating after learning that bags of stolen items were taken from a UK museum, including irreplaceable ancient artifacts dating back thousands of years. The museum's security procedures are now under review.

A major UK retailer has announced plans to close 50 stores nationwide, citing rising costs and increased online shopping activity.

A National UK firm has been fined £5m and delayed its financial results due to an ongoing accounting probe, while the company's shares plunged 13%.

Transport officials are managing the rollout of a major new national rail timetable this weekend, despite warnings of potential disruption on some routes.`,
    sourceArticles: [
      {
        title: "NHS Under Pressure from Super Flu Outbreak",
        url: "https://news.sky.com/story/nhs-super-flu-2024",
      },
      {
        title: "Bank of England Holds Interest Rates Steady",
        url: "https://news.sky.com/story/bank-of-england-rates-2024",
      },
      {
        title: "Museum Theft Investigation Underway",
        url: "https://news.sky.com/story/museum-theft-2024",
      },
      {
        title: "Major Retailer to Close 50 Stores",
        url: "https://news.sky.com/story/retailer-closures-2024",
      },
      {
        title: "UK Firm Fined £5m in Accounting Probe",
        url: "https://news.sky.com/story/firm-fined-2024",
      },
      {
        title: "New Rail Timetable Rollout This Weekend",
        url: "https://news.sky.com/story/rail-timetable-2024",
      },
    ],
    status: "approved",
    createdAt: "2026-02-15T10:30:00Z",
    updatedAt: "2026-02-15T14:20:00Z",
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
    const body: ComprehensiveSummaryUpdateRequest = await request.json();

    const summary = summariesStore.get(id);
    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      );
    }

    // Update the summary
    const updatedSummary: ComprehensiveSummary = {
      ...summary,
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
    const updatedSummary: ComprehensiveSummary = {
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

