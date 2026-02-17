import { NextRequest, NextResponse } from "next/server";

// Fake user database with three users
const FAKE_USERS = [
  {
    email: "adnan.salahuddin@sky.uk",
    password: "Sky@2025",
    name: "Adnan",
    role: "Software Engineer Graduate",
  },
  {
    email: "harry.taylor3@sky.uk",
    password: "Sky@2025",
    name: "Harry",
    role: "Associate Software Engineer",
  },
  {
    email: "taran.che@sky.uk",
    password: "Sky@2025",
    name: "Taran",
    role: "Associate Software Engineer",
  },
];

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = FAKE_USERS.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check password
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate token (in a real app, you would generate a JWT token here)
    const token = `fake-jwt-token-${Date.now()}`;

    // Prepare user data (excluding password)
    const userData = {
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        user: userData,
      },
      { status: 200 }
    );

    // Set HTTP-only cookies for authentication
    // AuthToken cookie - HTTP-only, secure, sameSite
    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // 7 days
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // User cookie - not HTTP-only so client can read user info for display
    response.cookies.set("user", JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // 7 days
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

// Optional: GET endpoint to list available test users (for development only)
export const GET = () =>
  NextResponse.json(
    {
      message: "Login API - POST to this endpoint with email and password",
      testUsers: FAKE_USERS.map((u) => ({
        email: u.email,
        password: u.password,
        role: u.role,
      })),
    },
    { status: 200 }
  );

