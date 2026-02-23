import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAllGenerations } from "@/lib/supabase";
import { getPresignedUrl } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email || !(await isAdmin(email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;

    const generations = await getAllGenerations(userId);

    // Generate presigned URLs for each generation and resolve s3: reference images
    const generationsWithUrls = await Promise.all(
      generations.map(async (gen) => {
        try {
          const presignedUrl = await getPresignedUrl(gen.result_url);

          const resolvedRefs = gen.reference_images
            ? await Promise.all(
                (gen.reference_images as string[]).map(async (ref: string) => {
                  if (ref.startsWith("s3:")) {
                    try {
                      return await getPresignedUrl(ref.slice(3));
                    } catch {
                      return ref;
                    }
                  }
                  return ref;
                })
              )
            : gen.reference_images;

          return { ...gen, result_url: presignedUrl, reference_images: resolvedRefs };
        } catch {
          return gen;
        }
      })
    );

    return NextResponse.json({ generations: generationsWithUrls });
  } catch (error) {
    console.error("Get generations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
