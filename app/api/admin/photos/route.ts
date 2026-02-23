import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, logAuditAction } from "@/lib/supabase";
import {
  listPresetPhotos,
  uploadPresetPhoto,
  deletePresetPhoto,
  getPresignedUrl,
} from "@/lib/s3";

// GET: List all preset photos
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

    const photos = await listPresetPhotos();

    // Add presigned URLs for previewing
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await getPresignedUrl(photo.key),
      }))
    );

    return NextResponse.json({ photos: photosWithUrls });
  } catch (error) {
    console.error("List photos error:", error);
    return NextResponse.json(
      { error: "Failed to list photos" },
      { status: 500 }
    );
  }
}

// POST: Upload a new preset photo
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate a safe filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = (name || file.name.replace(/\.[^.]+$/, ""))
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const timestamp = Date.now();
    const filename = `${safeName}-${timestamp}.${ext}`;

    const key = await uploadPresetPhoto(filename, buffer, file.type);

    await logAuditAction({
      action: "preset_photo_uploaded",
      actorEmail: adminEmail,
      details: { filename, key, size: file.size },
    });

    const url = await getPresignedUrl(key);

    return NextResponse.json({
      success: true,
      photo: { key, name: safeName, url, size: file.size },
    });
  } catch (error) {
    console.error("Upload photo error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove a preset photo
export async function DELETE(request: NextRequest) {
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

    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Photo key is required" },
        { status: 400 }
      );
    }

    // Ensure the key is within the presets prefix (prevent arbitrary S3 deletions)
    if (!key.startsWith("presets/")) {
      return NextResponse.json(
        { error: "Invalid photo key" },
        { status: 400 }
      );
    }

    await deletePresetPhoto(key);

    await logAuditAction({
      action: "preset_photo_deleted",
      actorEmail: adminEmail,
      details: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
