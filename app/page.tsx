"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { presets } from "@/lib/presets";
import { referenceImages } from "@/lib/reference-images";

type PresetPhoto = {
  id: string;
  name: string;
  key: string;
  url: string;
};

const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", price: 5, credits: 10 },
  { id: "popular", name: "Popular", price: 10, credits: 25, popular: true },
  { id: "pro", name: "Pro", price: 20, credits: 60 },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"image" | "video">("image");
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [video, setVideo] = useState<{ mimeType: string; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [presetPhotos, setPresetPhotos] = useState<PresetPhoto[]>([]);

  // Generate filename
  function generateFilename(type: "image" | "video") {
    const ext = type === "video" ? "mp4" : "png";
    return `retromsg ${type}.${ext}`;
  }

  // Download helper for base64 data
  function downloadBase64(data: string, mimeType: string, filename: string) {
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle image upload
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImages((prev) => [...prev, dataUrl]);
      // Auto-select if under limit
      if (selectedRefs.length < 3) {
        setSelectedRefs((prev) => [...prev, dataUrl]);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be uploaded again
    e.target.value = "";
  }

  // Toggle image selection (max 3)
  function toggleImageSelection(src: string) {
    setSelectedRefs((prev) => {
      if (prev.includes(src)) {
        return prev.filter((s) => s !== src);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 images
      }
      return [...prev, src];
    });
  }

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

  const notifyCreditsUpdated = useCallback(() => {
    window.dispatchEvent(new Event("creditsUpdated"));
  }, []);

  async function handlePurchase(packageId: string) {
    setPurchaseLoading(packageId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error("Checkout failed");
    } finally {
      setPurchaseLoading(null);
    }
  }

  const initializeUser = useCallback(async () => {
    try {
      await fetch("/api/user");
    } catch {
      console.error("Failed to initialize user");
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      initializeUser();
    }
  }, [isSignedIn, initializeUser]);

  // Fetch preset photos from S3
  useEffect(() => {
    async function fetchPresetPhotos() {
      try {
        const res = await fetch("/api/photos");
        if (res.ok) {
          const data = await res.json();
          setPresetPhotos(data.photos || []);
        }
      } catch {
        console.error("Failed to fetch preset photos");
      }
    }

    if (isSignedIn) {
      fetchPresetPhotos();
    }
  }, [isSignedIn]);

  // Handle Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      notifyCreditsUpdated();
      // Clear the URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("canceled") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notifyCreditsUpdated]);

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
        body: JSON.stringify({ prompt, referenceImages: selectedRefs, demoPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(data.error || "Insufficient credits");
          setShowPricing(true);
        } else {
          setError(data.error || "Generation failed");
        }
        return;
      }

      if (mode === "video") {
        setVideo(data.video || null);
      } else {
        setImage(data.image || null);
      }
      initializeUser();
      notifyCreditsUpdated();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-16">
          <h1 className="text-5xl md:text-7xl mb-6 text-[#d4af37] tracking-tight">
            retroAI
          </h1>
          <p className="text-2xl md:text-3xl text-[#ededed] mb-4 max-w-2xl">
            Why message when you can <span className="text-[#d4af37]">retro</span> message?
          </p>
          <p className="text-lg text-[#888] mb-8 max-w-xl">
            Create stunning vintage-style images and videos with AI.
            Transport your messages back to the golden age of cinema.
          </p>
          <div className="flex gap-4">
            <SignUpButton mode="modal">
              <button className="btn-primary text-lg px-8 py-3">
                Get Started
              </button>
            </SignUpButton>
          </div>
        </section>

        {/* Sample Gallery - Film Strip Carousel */}
        <section className="py-16 border-t border-[#333]">
          <h2 className="text-3xl text-[#d4af37] text-center mb-4 px-4">See What You Can Create</h2>
          <p className="text-[#888] text-center mb-12 max-w-lg mx-auto px-4">
            From vintage portraits to classic movie moments — bring your ideas to life in timeless style
          </p>
          <div className="film-strip-container">
            <div className="film-strip">
              {/* First set of images */}
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20auto%20race.jpg" alt="Vintage auto race" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20chem%20lab%201.jpg" alt="Vintage chemistry lab" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20monkey business.jpg" alt="Monkey business" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20saddle up.jpg" alt="Saddle up" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20happy trucker.jpg" alt="Happy trucker" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20childs play.jpg" alt="Child's play" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20grumpy.jpg" alt="Grumpy" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20nine to five.jpg" alt="Nine to five" />
                </div>
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20auto%20race.jpg" alt="Vintage auto race" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20chem%20lab%201.jpg" alt="Vintage chemistry lab" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20monkey business.jpg" alt="Monkey business" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20saddle up.jpg" alt="Saddle up" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20happy trucker.jpg" alt="Happy trucker" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20childs play.jpg" alt="Child's play" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20grumpy.jpg" alt="Grumpy" />
                </div>
              </div>
              <div className="film-frame">
                <div className="film-frame-inner">
                  <img src="/retroAI%20nine to five.jpg" alt="Nine to five" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 border-t border-[#333]">
          <h2 className="text-3xl text-[#d4af37] text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">1</div>
              <h3 className="text-xl text-[#d4af37] mb-2">Describe Your Vision</h3>
              <p className="text-[#888]">Enter a prompt or choose from vintage presets to set the scene</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">2</div>
              <h3 className="text-xl text-[#d4af37] mb-2">AI Creates Magic</h3>
              <p className="text-[#888]">Our AI generates authentic vintage-style images or videos</p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">3</div>
              <h3 className="text-xl text-[#d4af37] mb-2">Share & Download</h3>
              <p className="text-[#888]">Save your creations and share the nostalgia</p>
            </div>
          </div>
        </section>

        {/* Video Preview Section */}
        <section className="py-16 px-4 border-t border-[#333]">
          <h2 className="text-3xl text-[#d4af37] text-center mb-4">Bring Stills to Life</h2>
          <p className="text-[#888] text-center mb-12 max-w-lg mx-auto">
            Generate vintage videos complete with authentic film grain and classic aesthetics
          </p>
          <div className="max-w-2xl mx-auto">
            <video
              className="w-full rounded-lg border border-[#333]"
              autoPlay
              muted
              loop
              playsInline
              controls
              poster="/retroAI%20auto%20race.jpg"
              src="/preview-video.mp4"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 border-t border-[#333] text-center">
          <h2 className="text-3xl md:text-4xl text-[#ededed] mb-4">Ready to Go Retro?</h2>
          <p className="text-[#888] mb-8 max-w-md mx-auto">
            Sign up now and start creating timeless vintage content with AI
          </p>
          <SignUpButton mode="modal">
            <button className="btn-primary text-lg px-8 py-3">
              Start Creating
            </button>
          </SignUpButton>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-[#333] text-center">
          <p className="text-[#666] text-sm mb-2">RetroAI</p>
          <div className="flex justify-center gap-4 text-xs text-[#555]">
            <a href="/terms" className="hover:text-[#d4af37] transition-colors">Terms & Conditions</a>
            <span>|</span>
            <a href="/privacy" className="hover:text-[#d4af37] transition-colors">Privacy Policy</a>
          </div>
        </footer>
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
      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-[#d4af37]">Buy Credits</h2>
              <button
                onClick={() => setShowPricing(false)}
                className="text-[#888] hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="text-[#888] mb-6 text-center">
              1 credit = 1 image generation | 7 credits = 1 video generation
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border rounded-lg p-4 text-center ${
                    pkg.popular
                      ? "border-[#d4af37] bg-[#d4af37]/10"
                      : "border-[#333]"
                  }`}
                >
                  {pkg.popular && (
                    <span className="text-xs bg-[#d4af37] text-black px-2 py-1 rounded mb-2 inline-block">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl text-white mb-2">{pkg.name}</h3>
                  <p className="text-3xl text-[#d4af37] font-bold mb-1">
                    ${pkg.price}
                  </p>
                  <p className="text-[#888] mb-4">{pkg.credits} credits</p>
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchaseLoading === pkg.id}
                    className="w-full py-2 bg-[#d4af37] text-black rounded hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                  >
                    {purchaseLoading === pkg.id ? "Loading..." : "Buy Now"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <p className="text-sm text-[#888] mb-2">
            Reference images (optional, select up to 3):
            {selectedRefs.length > 0 && (
              <span className="text-[#d4af37] ml-2">{selectedRefs.length}/3 selected</span>
            )}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedRefs([])}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 flex items-center justify-center text-xs ${
                selectedRefs.length === 0
                  ? "border-[#d4af37] bg-[#1a1a1a]"
                  : "border-[#333] bg-[#111]"
              }`}
            >
              None
            </button>
            {/* Upload button */}
            <label className="flex-shrink-0 w-16 h-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors border-[#555] bg-[#111] hover:border-[#d4af37] hover:bg-[#1a1a1a]">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <svg
                className="w-6 h-6 text-[#888]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </label>
            {/* Uploaded images */}
            {uploadedImages.map((img, index) => (
              <button
                key={`uploaded-${index}`}
                type="button"
                onClick={() => toggleImageSelection(img)}
                className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                  selectedRefs.includes(img)
                    ? "border-[#d4af37]"
                    : "border-[#333]"
                }`}
              >
                <img
                  src={img}
                  alt={`Uploaded ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedRefs.includes(img) && (
                  <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-xs w-5 h-5 flex items-center justify-center rounded-bl">
                    {selectedRefs.indexOf(img) + 1}
                  </div>
                )}
              </button>
            ))}
            {presetPhotos.map((photo) => {
              const refId = `s3:${photo.key}`;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => toggleImageSelection(refId)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                    selectedRefs.includes(refId)
                      ? "border-[#d4af37]"
                      : "border-[#333]"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedRefs.includes(refId) && (
                    <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-xs w-5 h-5 flex items-center justify-center rounded-bl">
                      {selectedRefs.indexOf(refId) + 1}
                    </div>
                  )}
                </button>
              );
            })}
            {referenceImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => toggleImageSelection(img.src)}
                className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                  selectedRefs.includes(img.src)
                    ? "border-[#d4af37]"
                    : "border-[#333]"
                }`}
              >
                <img
                  src={img.src}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                {selectedRefs.includes(img.src) && (
                  <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-xs w-5 h-5 flex items-center justify-center rounded-bl">
                    {selectedRefs.indexOf(img.src) + 1}
                  </div>
                )}
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

      {loading && (
        <div className="card p-6 mb-8 text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#333] border-t-[#d4af37] rounded-full animate-spin mb-4"></div>
          <p className="text-[#d4af37]">
            {mode === "video" ? "Generating video..." : "Generating image..."}
          </p>
          {mode === "video" && (
            <p className="text-sm text-[#666] mt-2">This may take 1-2 minutes</p>
          )}
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
          <button
            onClick={() => downloadBase64(image.data, image.mimeType, generateFilename("image"))}
            className="btn-primary w-full mt-4"
          >
            Download Image
          </button>
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
          <button
            onClick={() => downloadBase64(video.data, video.mimeType, generateFilename("video"))}
            className="btn-primary w-full mt-4"
          >
            Download Video
          </button>
        </div>
      )}

      <div className="border-t border-[#333] pt-8 text-center">
        <Link
          href="/gallery"
          className="inline-block btn-primary px-8"
        >
          View Your Creations
        </Link>
      </div>
    </div>
  );
}
