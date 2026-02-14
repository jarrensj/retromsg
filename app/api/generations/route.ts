import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateUser, getUserGenerations } from "@/lib/supabase";
import { getPresignedUrl } from "@/lib/s3";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);
    const generations = await getUserGenerations(user.id);

    // Generate presigned URLs for each generation
    const generationsWithUrls = await Promise.all(
      generations.map(async (gen) => ({
        ...gen,
        result_url: await getPresignedUrl(gen.result_url),
      }))
    );

    return NextResponse.json({ generations: generationsWithUrls });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
