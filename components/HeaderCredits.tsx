"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", price: 5, credits: 10 },
  { id: "popular", name: "Popular", price: 10, credits: 25, popular: true },
  { id: "pro", name: "Pro", price: 20, credits: 60 },
];

export default function HeaderCredits() {
  const { isSignedIn } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {
      console.error("Failed to fetch credits");
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchCredits();
    }
  }, [isSignedIn, fetchCredits]);

  // Handle Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      fetchCredits();
    }
  }, [fetchCredits]);

  // Listen for credit updates from other components
  useEffect(() => {
    const handleCreditsUpdate = () => fetchCredits();
    window.addEventListener("creditsUpdated", handleCreditsUpdate);
    return () => window.removeEventListener("creditsUpdated", handleCreditsUpdate);
  }, [fetchCredits]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handlePurchase(packageId: string) {
    setPurchaseLoading(packageId);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setError("Failed to start checkout");
    } finally {
      setPurchaseLoading(null);
    }
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {/* Credits Button with Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#333] hover:border-[#d4af37] transition-colors"
        >
          <span className="text-sm text-[#888]">Credits:</span>
          <span className="text-sm text-[#d4af37] font-bold">{credits ?? "..."}</span>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-[#333]">
              <p className="text-xs text-[#666]">Current Balance</p>
              <p className="text-lg text-[#d4af37] font-bold">{credits ?? "..."} credits</p>
            </div>
            <button
              onClick={() => {
                setShowDropdown(false);
                setShowPricing(true);
                setError(null);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[#ededed] hover:bg-[#333] transition-colors"
            >
              Buy More Credits
            </button>
          </div>
        )}
      </div>

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
            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border rounded-lg p-4 text-center flex flex-col ${
                    pkg.popular
                      ? "border-[#d4af37] bg-[#d4af37]/10"
                      : "border-[#333]"
                  }`}
                >
                  <div className="h-6 mb-2 flex items-center justify-center">
                    {pkg.popular && (
                      <span className="text-xs bg-[#d4af37] text-black px-2 py-1 rounded">
                        Most Popular
                      </span>
                    )}
                  </div>
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
    </>
  );
}
