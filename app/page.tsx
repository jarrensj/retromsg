"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { presets } from "@/lib/presets";

type Generation = {
  id: string;
  prompt: string;
  source_url: string | null;
  result_url: string;
  created_at: string;
};

export default function Home() {
  const { isSignedIn } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"image" | "video">("image");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

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

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setImage(data.image || null);
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
          disabled={loading || !prompt.trim() || mode === "video"}
          className="btn-primary w-full"
        >
          {mode === "video" ? "Coming soon" : loading ? "Generating..." : "Generate"}
        </button>
      </form>

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
                <img
                  src={gen.result_url}
                  alt={gen.prompt}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3">
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
