import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, removeAdmin, logAuditAction, getAdmins } from "@/lib/supabase";

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

    // Prevent removing yourself
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot remove yourself as admin" },
        { status: 400 }
      );
    }

    // Prevent removing the last admin
    const admins = await getAdmins();
    if (admins.length <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    await removeAdmin(email);

    // Log the action
    await logAuditAction({
      action: "admin_removed",
      actorEmail: adminEmail,
      targetEmail: email.toLowerCase(),
    });

    return NextResponse.json({ success: true, email: email.toLowerCase() });
  } catch (error) {
    console.error("Remove admin error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
