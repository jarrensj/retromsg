import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!DEMO_PASSWORD) {
      // No password set, allow access
      return NextResponse.json({ success: true });
    }

    if (password === DEMO_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Password verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
