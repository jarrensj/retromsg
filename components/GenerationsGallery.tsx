"use client";

export type Generation = {
  id: string;
  prompt: string;
  source_url: string | null;
  reference_images?: string[];
  result_url: string;
  type?: "image" | "video";
  created_at: string;
  user_id?: string;
  users?: {
    email: string;
    clerk_id: string;
  };
};

type GenerationsGalleryProps = {
  generations: Generation[];
  loading?: boolean;
  showUserEmail?: boolean;
  emptyMessage?: string;
  columns?: 3 | 4;
};

function generateFilename(type: "image" | "video") {
  const ext = type === "video" ? "mp4" : "png";
  return `retromsg ${type}.${ext}`;
}

function downloadUrl(url: string, filename: string) {
  const downloadLink = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  const link = document.createElement("a");
  link.href = downloadLink;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function GenerationsGallery({
  generations,
  loading = false,
  showUserEmail = false,
  emptyMessage = "No creations yet.",
  columns = 3,
}: GenerationsGalleryProps) {
  if (loading) {
    return <p className="text-center text-[#888]">Loading...</p>;
  }

  if (generations.length === 0) {
    return <p className="text-center text-[#666]">{emptyMessage}</p>;
  }

  const gridCols = columns === 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {generations.map((gen) => (
        <div key={gen.id} className="card">
          {gen.type === "video" ? (
            <video
              src={gen.result_url}
              className="w-full aspect-video object-cover"
              controls
            />
          ) : (
            <img
              src={gen.result_url}
              alt={gen.prompt}
              className="w-full aspect-square object-cover"
            />
          )}
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37]">
                {gen.type === "video" ? "Video" : "Image"}
              </span>
              {showUserEmail ? (
                <span className="text-xs text-[#666]">
                  {new Date(gen.created_at).toLocaleDateString()}
                </span>
              ) : (
                <button
                  onClick={() =>
                    downloadUrl(gen.result_url, generateFilename(gen.type || "image"))
                  }
                  className="text-xs underline text-[#888] hover:text-[#d4af37] transition-colors"
                >
                  Download
                </button>
              )}
            </div>
            {showUserEmail && (
              <p
                className="text-xs text-[#888] mb-1 truncate"
                title={gen.users?.email}
              >
                {gen.users?.email || "Unknown user"}
              </p>
            )}
            <p className="text-sm text-[#888] truncate" title={gen.prompt}>
              {gen.prompt}
            </p>
            {showUserEmail && gen.reference_images && gen.reference_images.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-[#666] mb-1">
                  Reference images ({gen.reference_images.length}):
                </p>
                <div className="flex gap-1 flex-wrap">
                  {gen.reference_images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      {img.startsWith("data:") ? (
                        <img
                          src={img}
                          alt={`Reference ${idx + 1}`}
                          className="w-10 h-10 object-cover rounded border border-[#333]"
                        />
                      ) : (
                        <img
                          src={img}
                          alt={`Reference ${idx + 1}`}
                          className="w-10 h-10 object-cover rounded border border-[#333]"
                        />
                      )}
                      <span className="absolute -top-1 -right-1 text-[8px] bg-[#d4af37] text-black px-1 rounded">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!showUserEmail && (
              <p className="text-xs text-[#666] mt-1">
                {new Date(gen.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
