import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    const filename = request.nextUrl.searchParams.get("filename") || "download";

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Fetch the file from S3
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set("Content-Type", blob.type);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
