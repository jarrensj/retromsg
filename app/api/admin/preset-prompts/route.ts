import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  isAdmin,
  getAllPresetCustomPrompts,
  getPresetCustomPrompt,
  updatePresetCustomPrompt,
  deletePresetCustomPrompt,
  logAuditAction,
} from "@/lib/supabase";

// GET: Retrieve all preset custom prompts
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

    const prompts = await getAllPresetCustomPrompts();

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Get preset prompts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preset prompts" },
      { status: 500 }
    );
  }
}

// POST: Update a preset's custom prompt
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

    const { presetId, customPrompt } = await request.json();

    if (!presetId || typeof presetId !== "string") {
      return NextResponse.json(
        { error: "presetId is required" },
        { status: 400 }
      );
    }

    const oldValue = (await getPresetCustomPrompt(presetId)) || "";
    const newValue =
      typeof customPrompt === "string" ? customPrompt.trim() : "";

    if (oldValue === newValue) {
      return NextResponse.json({ success: true });
    }

    if (newValue) {
      await updatePresetCustomPrompt(presetId, newValue, adminEmail);
    } else {
      await deletePresetCustomPrompt(presetId);
    }

    await logAuditAction({
      action: "preset_custom_prompt_updated",
      actorEmail: adminEmail,
      details: {
        presetId,
        old: oldValue || "(empty)",
        new: newValue || "(empty)",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update preset prompt error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update preset prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
