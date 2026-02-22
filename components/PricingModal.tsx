"use client";

import { useState } from "react";

const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", price: 5, credits: 10 },
  { id: "plus", name: "Plus", price: 10, credits: 25 },
  { id: "pro", name: "Pro", price: 20, credits: 60 },
];

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-[#d4af37]">Buy Credits</h2>
          <button
            onClick={onClose}
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
              className="border border-[#333] rounded-lg p-4 text-center flex flex-col"
            >
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
  );
}
