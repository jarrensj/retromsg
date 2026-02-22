import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdmin, getAdmins } from "@/lib/supabase";

export async function GET() {
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

    const admins = await getAdmins();

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("List admins error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}
