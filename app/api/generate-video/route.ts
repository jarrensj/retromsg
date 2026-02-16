import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import { getOrCreateUser, saveGeneration } from "@/lib/supabase";
import { s3, BUCKET } from "@/lib/s3";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Veo 2 model endpoint (long-running operation)
const VEO_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning";

// Operations status endpoint
const OPERATIONS_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);

    const { prompt, referenceImage } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
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
      prompt: `Create a vintage 1940s style video. ${prompt}`,
    };

    // Check if reference image is provided for image-to-video
    if (referenceImage) {
      try {
        const imagePath = path.join(process.cwd(), "public", referenceImage);
        const imageBuffer = await readFile(imagePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = referenceImage.endsWith(".png") ? "image/png" : "image/jpeg";

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
