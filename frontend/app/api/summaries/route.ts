import { NextRequest, NextResponse } from "next/server";
import { ComprehensiveSummary } from "@/types/summary";

// Mock data for the daily summary - in production, this would come from a database
// There is only one summary per day
let DAILY_SUMMARY: ComprehensiveSummary = {
  id: "daily-2026-02-17",
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
  status: "pending",
  createdAt: "2026-02-17T10:30:00Z",
  updatedAt: "2026-02-17T14:20:00Z",
};

// GET endpoint to fetch the daily summary
export const GET = (request: NextRequest) => {
  try {
    // Check authorization via cookies
    const authToken = request.cookies.get("authToken")?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Return the daily summary if it matches the requested status
    if (status && DAILY_SUMMARY.status !== status) {
      return NextResponse.json(
        { summary: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { summary: DAILY_SUMMARY },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// PATCH endpoint to update the daily summary
export const PATCH = async (request: NextRequest) => {
  try {
    // Check authorization via cookies
    const authToken = request.cookies.get("authToken")?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { summaryText } = body;

    if (!summaryText) {
      return NextResponse.json(
        { error: "Summary text is required" },
        { status: 400 }
      );
    }

    // Update the summary
    DAILY_SUMMARY = {
      ...DAILY_SUMMARY,
      summaryText,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { summary: DAILY_SUMMARY },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// POST endpoint to publish (approve) the daily summary
export const POST = async (request: NextRequest) => {
  try {
    // Check authorization via cookies
    const authToken = request.cookies.get("authToken")?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action !== "approve") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Approve the summary
    DAILY_SUMMARY = {
      ...DAILY_SUMMARY,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        summary: DAILY_SUMMARY,
        message: "Summary published successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error publishing summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

