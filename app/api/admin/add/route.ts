import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, addAdmin, logAuditAction } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const adminEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!adminEmail || !(await isAdmin(adminEmail))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    await addAdmin(email, adminEmail);

    // Log the action
    await logAuditAction({
      action: "admin_added",
      actorEmail: adminEmail,
      targetEmail: email.toLowerCase(),
    });

    return NextResponse.json({ success: true, email: email.toLowerCase() });
  } catch (error) {
    console.error("Add admin error:", error);
    const message = error instanceof Error ? error.message : "Failed to add admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
