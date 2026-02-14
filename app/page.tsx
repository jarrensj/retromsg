"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

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
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  const initializeUser = useCallback(async () => {
    try {
      // Ensure user exists in Supabase
      await fetch("/api/user");

      // Fetch their generations
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
        body: JSON.stringify({ prompt }),
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
    return <p>Sign in to generate</p>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1>retroAI</h1>

      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt..."
          rows={3}
          style={{ width: "100%", maxWidth: 400, border: "1px solid #ccc", padding: 8 }}
          disabled={loading}
        />
        <br />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {image && (
        <div style={{ marginTop: 20 }}>
          <h3>Generated Image</h3>
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt="Generated"
            style={{ maxWidth: 500 }}
          />
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>Your Generations</h2>
      {loadingGallery ? (
        <p>Loading...</p>
      ) : generations.length === 0 ? (
        <p style={{ color: "#666" }}>No generations yet. Create your first one above!</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {generations.map((gen) => (
            <div
              key={gen.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <img
                src={gen.result_url}
                alt={gen.prompt}
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
              />
              <div style={{ padding: 8 }}>
                <p
                  style={{
                    fontSize: 12,
                    color: "#666",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={gen.prompt}
                >
                  {gen.prompt}
                </p>
                <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0" }}>
                  {new Date(gen.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
