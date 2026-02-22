"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import PricingModal from "./PricingModal";

export default function HeaderCredits() {
  const { isSignedIn } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
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
              }}
              className="w-full px-3 py-2 text-left text-sm text-[#ededed] hover:bg-[#333] transition-colors"
            >
              Buy More Credits
            </button>
          </div>
        )}
      </div>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
}
