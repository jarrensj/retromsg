import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call Gemini image generation API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
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
    const parts = data.candidates?.[0]?.content?.parts || [];

    // Extract text and image from response
    let text = "";
    let imageData = null;

    for (const part of parts) {
      if (part.text) {
        text = part.text;
      }
      if (part.inlineData) {
        imageData = {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        };
      }
    }

    return NextResponse.json({
      success: true,
      text,
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
