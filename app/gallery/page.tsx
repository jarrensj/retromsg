"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import GenerationsGallery, { Generation } from "@/components/GenerationsGallery";

export default function GalleryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGenerations = useCallback(async () => {
    try {
      const res = await fetch("/api/generations");
      if (res.ok) {
        const data = await res.json();
        setGenerations(data.generations || []);
      }
    } catch {
      console.error("Failed to fetch generations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchGenerations();
    }
  }, [isSignedIn, fetchGenerations]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#888]">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#888]">Please sign in to view your gallery.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-[#d4af37]">Your Creations</h1>
          <p className="text-[#888] mt-1">
            {generations.length} {generations.length === 1 ? "creation" : "creations"}
          </p>
        </div>
        <Link href="/" className="btn-primary">
          Create New
        </Link>
      </div>

      <GenerationsGallery
        generations={generations}
        loading={loading}
        emptyMessage="No creations yet. Generate your first one!"
      />
    </div>
  );
}
