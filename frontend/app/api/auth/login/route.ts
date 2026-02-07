import { NextRequest, NextResponse } from "next/server";

// Fake user database with three users
const FAKE_USERS = [
  {
    email: "admin@sky.uk",
    password: "Admin123!",
    name: "Admin User",
    role: "admin",
  },
  {
    email: "editor@sky.uk",
    password: "Editor123!",
    name: "Editor User",
    role: "editor",
  },
  {
    email: "viewer@sky.uk",
    password: "Viewer123!",
    name: "Viewer User",
    role: "viewer",
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

    // Successful login - return user data (excluding password)
    return NextResponse.json(
      {
        success: true,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
        // In a real app, you would generate a JWT token here
        token: `fake-jwt-token-${Date.now()}`,
      },
      { status: 200 }
    );
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

