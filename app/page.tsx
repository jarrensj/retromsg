"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { presets } from "@/lib/presets";
import { referenceImages } from "@/lib/reference-images";

type Generation = {
  id: string;
  prompt: string;
  source_url: string | null;
  result_url: string;
  type?: "image" | "video";
  created_at: string;
};

export default function Home() {
  const { isSignedIn } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"image" | "video">("image");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [video, setVideo] = useState<{ mimeType: string; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [demoPassword, setDemoPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: demoPassword }),
      });

      if (res.ok) {
        setIsUnlocked(true);
        sessionStorage.setItem("demo_password", demoPassword);
      } else {
        setPasswordError("Incorrect password");
      }
    } catch {
      setPasswordError("Something went wrong");
    }
  }

  // Check if already unlocked this session
  useEffect(() => {
    const savedPassword = sessionStorage.getItem("demo_password");
    if (savedPassword) {
      setDemoPassword(savedPassword);
      setIsUnlocked(true);
    }
  }, []);

  const initializeUser = useCallback(async () => {
    try {
      await fetch("/api/user");
      const genRes = await fetch("/api/generations");
      if (genRes.ok) {
        const genData = await genRes.json();
        setGenerations(genData.generations || []);
      }
    } catch {
      console.error("Failed to initialize user");
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      initializeUser();
    }
  }, [isSignedIn, initializeUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setImage(null);
    setVideo(null);

    try {
      const endpoint = mode === "video" ? "/api/generate-video" : "/api/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImage: selectedRef, demoPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      if (mode === "video") {
        setVideo(data.video || null);
      } else {
        setImage(data.image || null);
      }
      initializeUser();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-4xl md:text-6xl mb-4 text-[#d4af37]">retroAI</h1>
        <p className="text-xl text-[#888] mb-8 max-w-md">
          Create stunning vintage-style images and videos with AI
        </p>
        <p className="text-[#666]">Sign in to start creating</p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-4xl md:text-6xl mb-4 text-[#d4af37]">retroAI</h1>
        <p className="text-xl text-[#888] mb-8 max-w-md">
          Enter demo password to continue
        </p>
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs">
          <input
            type="password"
            value={demoPassword}
            onChange={(e) => setDemoPassword(e.target.value)}
            placeholder="Demo password"
            className="w-full p-3 mb-4 text-center"
            autoFocus
          />
          {passwordError && (
            <p className="text-red-400 text-sm mb-4">{passwordError}</p>
          )}
          <button type="submit" className="btn-primary w-full">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl text-[#d4af37] mb-2">Create</h1>
        <p className="text-[#888]">Generate vintage AI creations</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setMode("image")}
            className={`toggle-btn ${mode === "image" ? "active" : ""}`}
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => setMode("video")}
            className={`toggle-btn ${mode === "video" ? "active" : ""}`}
          >
            Video
          </button>
        </div>

        {/* Reference Image Picker */}
        <div className="mb-4">
          <p className="text-sm text-[#888] mb-2">Reference image (optional):</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedRef(null)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 flex items-center justify-center text-xs ${
                selectedRef === null
                  ? "border-[#d4af37] bg-[#1a1a1a]"
                  : "border-[#333] bg-[#111]"
              }`}
            >
              None
            </button>
            {referenceImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedRef(img.src)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                  selectedRef === img.src
                    ? "border-[#d4af37]"
                    : "border-[#333]"
                }`}
              >
                <img
                  src={img.src}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Preset Selector */}
        <select
          onChange={(e) => {
            const preset = presets.find((p) => p.id === e.target.value);
            if (preset) setPrompt(preset.prompt);
          }}
          className="w-full p-3 mb-4"
          disabled={loading}
          defaultValue=""
        >
          <option value="" disabled>
            Select a preset prompt...
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        {/* Prompt Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt or select a preset above..."
          rows={4}
          className="w-full p-3 mb-4 resize-none"
          disabled={loading}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="btn-primary w-full"
        >
          {loading
            ? mode === "video"
              ? "Generating video (this may take a few minutes)..."
              : "Generating..."
            : mode === "video"
            ? "Generate Video"
            : "Generate Image"}
        </button>
      </form>

      {loading && mode === "video" && (
        <div className="card p-6 mb-8 text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#333] border-t-[#d4af37] rounded-full animate-spin mb-4"></div>
          <p className="text-[#d4af37]">Generating video...</p>
          <p className="text-sm text-[#666] mt-2">This may take 1-2 minutes</p>
        </div>
      )}

      {error && (
        <div className="card p-4 mb-8 border-red-500 text-red-400 text-center">
          {error}
        </div>
      )}

      {image && (
        <div className="card p-6 mb-8">
          <h3 className="text-xl text-[#d4af37] mb-4 text-center">Generated Image</h3>
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt="Generated"
            className="max-w-full mx-auto rounded"
          />
        </div>
      )}

      {video && (
        <div className="card p-6 mb-8">
          <h3 className="text-xl text-[#d4af37] mb-4 text-center">Generated Video</h3>
          <video
            src={`data:${video.mimeType};base64,${video.data}`}
            controls
            autoPlay
            loop
            className="max-w-full mx-auto rounded"
          />
        </div>
      )}

      <div className="border-t border-[#333] pt-8">
        <h2 className="text-2xl text-[#d4af37] mb-6 text-center">Your Creations</h2>
        {loadingGallery ? (
          <p className="text-center text-[#888]">Loading...</p>
        ) : generations.length === 0 ? (
          <p className="text-center text-[#666]">
            No creations yet. Generate your first one above!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="card">
                {gen.type === "video" ? (
                  <video
                    src={gen.result_url}
                    className="w-full aspect-video object-cover"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={gen.result_url}
                    alt={gen.prompt}
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37]">
                      {gen.type === "video" ? "Video" : "Image"}
                    </span>
                  </div>
                  <p
                    className="text-sm text-[#888] truncate"
                    title={gen.prompt}
                  >
                    {gen.prompt}
                  </p>
                  <p className="text-xs text-[#666] mt-1">
                    {new Date(gen.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
