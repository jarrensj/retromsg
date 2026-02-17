import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import { getOrCreateUser, saveGeneration } from "@/lib/supabase";
import { s3, BUCKET } from "@/lib/s3";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(clerkId);

    const { prompt, referenceImage, demoPassword } = await request.json();

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

    // Build the parts array for Gemini
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // If reference image provided, include it
    if (referenceImage) {
      try {
        const imagePath = path.join(process.cwd(), "public", referenceImage);
        const imageBuffer = await readFile(imagePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = referenceImage.endsWith(".png") ? "image/png" : "image/jpeg";

        parts.push({
          inlineData: {
            mimeType,
            data: base64Image,
          },
        });
        parts.push({
          text: `Use this reference image as style inspiration. ${prompt}`,
        });
      } catch (err) {
        console.error("Failed to read reference image:", err);
        parts.push({ text: prompt });
      }
    } else {
      parts.push({ text: prompt });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini error:", JSON.stringify(errorData, null, 2));
      return NextResponse.json(
        { error: errorData?.error?.message || "AI generation failed", details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];

    let imageData = null;
    for (const part of responseParts) {
      if (part.inlineData) {
        imageData = {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        };
        break;
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const key = `generations/${clerkId}/${timestamp}.png`;
    const buffer = Buffer.from(imageData.data, "base64");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: imageData.mimeType,
      })
    );

    await saveGeneration({
      userId: user.id,
      prompt,
      sourceUrl: referenceImage || undefined,
      resultUrl: key,
      type: "image",
    });

    return NextResponse.json({
      success: true,
      image: imageData,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
