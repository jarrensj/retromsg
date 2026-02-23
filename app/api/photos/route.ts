import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listPresetPhotos, getPresignedUrl } from "@/lib/s3";

// GET: List all preset photos with presigned URLs (for generate form)
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photos = await listPresetPhotos();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        id: photo.key,
        name: photo.name
          .replace(/-\d+$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        key: photo.key,
        url: await getPresignedUrl(photo.key),
      }))
    );

    return NextResponse.json({ photos: photosWithUrls });
  } catch (error) {
    console.error("List public photos error:", error);
    return NextResponse.json(
      { error: "Failed to list photos" },
      { status: 500 }
    );
  }
}
