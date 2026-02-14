"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div style={{ padding: 20 }}>
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
          style={{ backgroundColor: "#2563eb", color: "white", padding: "8px 16px", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {image && (
        <img
          src={`data:${image.mimeType};base64,${image.data}`}
          alt="Generated"
          style={{ maxWidth: 500, marginTop: 20 }}
        />
      )}
    </div>
  );
}
