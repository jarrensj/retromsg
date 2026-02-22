import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import { getOrCreateUser, saveGeneration, deductCredits } from "@/lib/supabase";
import { s3, BUCKET } from "@/lib/s3";
import { CREDIT_COSTS } from "@/lib/stripe";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

// Veo 3.1 model endpoint (long-running operation) - generates video with native audio
const VEO_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning";

// Operations status endpoint
const OPERATIONS_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);

    const { prompt, referenceImages, demoPassword } = await request.json();

    // Verify demo password if set
    if (DEMO_PASSWORD && demoPassword !== DEMO_PASSWORD) {
      return NextResponse.json({ error: "Invalid demo password" }, { status: 401 });
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check and deduct credits (7 credits for video)
    const hasCredits = await deductCredits(clerkId, CREDIT_COSTS.video);
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits. Video generation requires 7 credits." },
        { status: 402 }
      );
    }

    // Build the request for Veo API
    interface VeoInstance {
      prompt: string;
      image?: {
        bytesBase64Encoded: string;
        mimeType: string;
      };
    }

    const instance: VeoInstance = {
      prompt: `Create a vintage 1940s style video. ${prompt}. Add authentic film aging effects: random dust particles floating across the frame, film grain texture, light scratches and scuff marks on the film, slightly faded colors with a sepia-warm tone, and occasional film flicker.`,
    };

    // Check if reference image is provided for image-to-video (use first image only)
    const refs = Array.isArray(referenceImages) ? referenceImages : [];
    const referenceImage = refs[0];
    if (referenceImage) {
      try {
        let base64Image: string;
        let mimeType: string;

        // Check if it's a data URL (uploaded image)
        if (referenceImage.startsWith("data:")) {
          const matches = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Image = matches[2];
          } else {
            throw new Error("Invalid data URL format");
          }
        } else {
          // It's a file path - read from public directory
          const imagePath = path.join(process.cwd(), "public", referenceImage);
          const imageBuffer = await readFile(imagePath);
          base64Image = imageBuffer.toString("base64");
          mimeType = referenceImage.endsWith(".png") ? "image/png" : "image/jpeg";
        }

        instance.image = {
          bytesBase64Encoded: base64Image,
          mimeType: mimeType,
        };
      } catch (err) {
        console.error("Failed to read reference image:", err);
      }
    }

    const requestBody = {
      instances: [instance],
      parameters: {
        aspectRatio: "16:9",
        durationSeconds: 6,
      },
    };

    // Start the video generation (async operation)
    const response = await fetch(VEO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Veo API error:", JSON.stringify(errorData, null, 2));
      return NextResponse.json(
        { error: errorData?.error?.message || "Video generation failed", details: errorData },
        { status: 500 }
      );
    }

    const operationData = await response.json();
    const operationName = operationData.name;

    if (!operationName) {
      return NextResponse.json(
        { error: "Failed to start video generation" },
        { status: 500 }
      );
    }

    // Poll for completion (with timeout)
    console.log("Started operation:", operationName);
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;
    let videoData = null;
    let lastStatusData = null;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(
        `${OPERATIONS_URL}/${operationName}`,
        {
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
          },
        }
      );

      if (!statusResponse.ok) {
        const statusError = await statusResponse.json();
        console.error("Status check error:", statusError);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      lastStatusData = statusData;
      console.log(`Poll attempt ${attempts + 1}:`, JSON.stringify(statusData, null, 2));

      if (statusData.done) {
        if (statusData.error) {
          console.error("Veo generation error:", statusData.error);
          return NextResponse.json(
            { error: statusData.error.message || "Video generation failed" },
            { status: 500 }
          );
        }

        // Extract video from response
        const response = statusData.response || statusData.result;
        console.log("Response object:", JSON.stringify(response, null, 2));

        const videos = response?.generateVideoResponse?.generatedSamples;

        if (videos && videos.length > 0) {
          const videoObj = videos[0].video;

          // Video is returned as a URI to download
          if (videoObj?.uri) {
            console.log("Downloading video from:", videoObj.uri);

            // Try with API key as query param (Google's file download format)
            const downloadUrl = `${videoObj.uri}&key=${GEMINI_API_KEY}`;
            const videoResponse = await fetch(downloadUrl);

            console.log("Download response status:", videoResponse.status);

            if (videoResponse.ok) {
              const videoBuffer = await videoResponse.arrayBuffer();
              console.log("Downloaded video size:", videoBuffer.byteLength);
              videoData = {
                mimeType: videoResponse.headers.get("content-type") || "video/mp4",
                data: Buffer.from(videoBuffer).toString("base64"),
              };
            } else {
              const errorText = await videoResponse.text();
              console.error("Failed to download video:", videoResponse.status, errorText);
            }
          } else if (videoObj?.bytesBase64Encoded) {
            // Fallback for base64 response
            videoData = {
              mimeType: videoObj.mimeType || "video/mp4",
              data: videoObj.bytesBase64Encoded,
            };
          }
        }
        break;
      }

      attempts++;
    }

    if (!videoData || !videoData.data) {
      console.error("Final status data:", JSON.stringify(lastStatusData, null, 2));
      return NextResponse.json(
        { error: "Video generation timed out or failed", lastStatus: lastStatusData },
        { status: 500 }
      );
    }

    // Upload video to S3
    const timestamp = Date.now();
    const key = `generations/${clerkId}/${timestamp}.mp4`;
    const buffer = Buffer.from(videoData.data, "base64");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: videoData.mimeType,
      })
    );

    // Save to database with type indicator
    await saveGeneration({
      userId: user.id,
      prompt,
      sourceUrl: referenceImage || undefined,
      resultUrl: key,
      type: "video",
    });

    return NextResponse.json({
      success: true,
      video: videoData,
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
