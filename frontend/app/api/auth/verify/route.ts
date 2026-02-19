import { NextRequest, NextResponse } from "next/server";

export const GET = (request: NextRequest) => {
  try {
    // Get authToken from cookies
    const authToken = request.cookies.get("authToken")?.value;
    const userCookie = request.cookies.get("user")?.value;

    if (!authToken || !userCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Parse user data
    let user = null;
    try {
      user = JSON.parse(userCookie);
    } catch (error) {
      console.error("Failed to parse user cookie:", error);
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // In a real app, you would validate the JWT token here
    // For now, we just check if the token exists
    return NextResponse.json(
      {
        authenticated: true,
        user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

