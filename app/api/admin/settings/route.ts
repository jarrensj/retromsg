import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  isAdmin,
  getDefaultPrompts,
  updateSetting,
  logAuditAction,
} from "@/lib/supabase";

// GET: Retrieve current default prompts
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

    const prompts = await getDefaultPrompts();

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST: Update default prompts
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

    const { imagePrompt, videoPrompt } = await request.json();

    // Get current prompts to log the change
    const currentPrompts = await getDefaultPrompts();

    if (typeof imagePrompt === "string" && imagePrompt.trim()) {
      const oldValue = currentPrompts.image;
      const newValue = imagePrompt.trim();
      if (oldValue !== newValue) {
        await updateSetting("default_image_prompt", newValue, adminEmail);
        await logAuditAction({
          action: "image_prompt_updated",
          actorEmail: adminEmail,
          details: {
            old: oldValue,
            new: newValue,
          },
        });
      }
    }

    if (typeof videoPrompt === "string" && videoPrompt.trim()) {
      const oldValue = currentPrompts.video;
      const newValue = videoPrompt.trim();
      if (oldValue !== newValue) {
        await updateSetting("default_video_prompt", newValue, adminEmail);
        await logAuditAction({
          action: "video_prompt_updated",
          actorEmail: adminEmail,
          details: {
            old: oldValue,
            new: newValue,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
