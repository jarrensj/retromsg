"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import GenerationsGallery, { Generation } from "@/components/GenerationsGallery";
import { presets } from "@/lib/presets";
import { referenceImages } from "@/lib/reference-images";

type PresetPhoto = {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified: string;
};

type User = {
  id: string;
  clerk_id: string;
  email: string;
  credits: number;
  created_at: string;
};

type AuditLog = {
  id: string;
  action: string;
  actor_email: string;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Admin = {
  id: string;
  email: string;
  created_at: string;
  created_by: string | null;
};

type CreditPurchase = {
  id: string;
  credits: number;
  amount_cents: number;
  stripe_session_id: string | null;
  created_at: string;
  user_id: string;
  users: {
    email: string;
  } | null;
};

type Tab = "gallery" | "photos" | "presets" | "purchases" | "admins" | "audit" | "settings";

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("gallery");
  const [users, setUsers] = useState<User[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState("");
  const [addAdminSuccess, setAddAdminSuccess] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminRefreshKey, setAdminRefreshKey] = useState(0);
  const [removingAdminEmail, setRemovingAdminEmail] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [expandedAuditLog, setExpandedAuditLog] = useState<string | null>(null);

  // Photos tab state
  const [presetPhotos, setPresetPhotos] = useState<PresetPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [deletingPhotoKey, setDeletingPhotoKey] = useState<string | null>(null);
  const [photosRefreshKey, setPhotosRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Presets tab state
  const [presetCustomPrompts, setPresetCustomPrompts] = useState<Record<string, string>>({});
  const [presetPromptsLoading, setPresetPromptsLoading] = useState(false);
  const [presetPromptsSaving, setPresetPromptsSaving] = useState<string | null>(null);
  const [presetPromptsMessage, setPresetPromptsMessage] = useState("");

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    }

    if (isSignedIn) {
      checkAdmin();
    }
  }, [isSignedIn]);

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch {
        console.error("Failed to fetch users");
      }
    }

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Fetch generations
  useEffect(() => {
    async function fetchGenerations() {
      setLoadingGenerations(true);
      try {
        const url = selectedUserId
          ? `/api/admin/generations?userId=${selectedUserId}`
          : "/api/admin/generations";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setGenerations(data.generations || []);
        }
      } catch {
        console.error("Failed to fetch generations");
      } finally {
        setLoadingGenerations(false);
      }
    }

    if (isAdmin) {
      fetchGenerations();
    }
  }, [isAdmin, selectedUserId]);

  // Fetch audit logs
  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const res = await fetch("/api/admin/audit");
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch {
        console.error("Failed to fetch audit logs");
      }
    }

    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin, adminRefreshKey]);

  // Fetch admins list
  useEffect(() => {
    async function fetchAdmins() {
      try {
        const res = await fetch("/api/admin/list");
        if (res.ok) {
          const data = await res.json();
          setAdmins(data.admins || []);
        }
      } catch {
        console.error("Failed to fetch admins");
      }
    }

    if (isAdmin) {
      fetchAdmins();
    }
  }, [isAdmin, adminRefreshKey]);

  // Fetch credit purchases
  useEffect(() => {
    async function fetchPurchases() {
      try {
        const res = await fetch("/api/admin/purchases");
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
        }
      } catch {
        console.error("Failed to fetch purchases");
      }
    }

    if (isAdmin) {
      fetchPurchases();
    }
  }, [isAdmin]);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      setSettingsLoading(true);
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setImagePrompt(data.image || "");
          setVideoPrompt(data.video || "");
        }
      } catch {
        console.error("Failed to fetch settings");
      } finally {
        setSettingsLoading(false);
      }
    }

    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  // Fetch preset photos
  useEffect(() => {
    async function fetchPhotos() {
      setPhotosLoading(true);
      try {
        const res = await fetch("/api/admin/photos");
        if (res.ok) {
          const data = await res.json();
          setPresetPhotos(data.photos || []);
        }
      } catch {
        console.error("Failed to fetch preset photos");
      } finally {
        setPhotosLoading(false);
      }
    }

    if (isAdmin) {
      fetchPhotos();
    }
  }, [isAdmin, photosRefreshKey]);

  // Fetch preset custom prompts
  useEffect(() => {
    async function fetchPresetPrompts() {
      setPresetPromptsLoading(true);
      try {
        const res = await fetch("/api/admin/preset-prompts");
        if (res.ok) {
          const data = await res.json();
          setPresetCustomPrompts(data.prompts || {});
        }
      } catch {
        console.error("Failed to fetch preset prompts");
      } finally {
        setPresetPromptsLoading(false);
      }
    }

    if (isAdmin) {
      fetchPresetPrompts();
    }
  }, [isAdmin]);

  async function handleSavePresetPrompt(presetId: string) {
    setPresetPromptsSaving(presetId);
    setPresetPromptsMessage("");

    try {
      const res = await fetch("/api/admin/preset-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId,
          customPrompt: presetCustomPrompts[presetId] || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPresetPromptsMessage(`Error: ${data.error || "Failed to save"}`);
        return;
      }

      const presetName = presets.find((p) => p.id === presetId)?.name
        || presetPhotos.find((p) => p.key === presetId)?.name
        || referenceImages.find((p) => p.src === presetId)?.name
        || presetId;
      setPresetPromptsMessage(`Saved custom prompt for "${presetName}"`);
    } catch {
      setPresetPromptsMessage("Error: Something went wrong");
    } finally {
      setPresetPromptsSaving(null);
    }
  }

  async function handlePhotoUpload(e: React.FormEvent) {
    e.preventDefault();
    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];

    if (!file) {
      setPhotoMessage("Error: Please select a file");
      return;
    }

    setPhotoUploading(true);
    setPhotoMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (photoName.trim()) {
        formData.append("name", photoName.trim());
      }

      const res = await fetch("/api/admin/photos", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setPhotoMessage(`Error: ${data.error || "Upload failed"}`);
        return;
      }

      setPhotoMessage("Photo uploaded successfully!");
      setPhotoName("");
      if (fileInput) fileInput.value = "";
      setPhotosRefreshKey((k) => k + 1);
    } catch {
      setPhotoMessage("Error: Something went wrong");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleDeletePhoto(key: string) {
    if (!confirm("Are you sure you want to delete this preset photo?")) {
      return;
    }

    setDeletingPhotoKey(key);
    setPhotoMessage("");

    try {
      const res = await fetch("/api/admin/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhotoMessage(`Error: ${data.error || "Delete failed"}`);
        return;
      }

      setPhotoMessage("Photo deleted successfully!");
      setPhotosRefreshKey((k) => k + 1);
    } catch {
      setPhotoMessage("Error: Something went wrong");
    } finally {
      setDeletingPhotoKey(null);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddAdminError("");
    setAddAdminSuccess("");
    setAddAdminLoading(true);

    try {
      const res = await fetch("/api/admin/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddAdminError(data.error || "Failed to add admin");
        return;
      }

      setAddAdminSuccess(`Added ${data.email} as admin`);
      setNewAdminEmail("");
      setAdminRefreshKey((k) => k + 1);
    } catch {
      setAddAdminError("Something went wrong");
    } finally {
      setAddAdminLoading(false);
    }
  }

  async function handleRemoveAdmin(email: string) {
    if (!confirm(`Are you sure you want to remove ${email} as admin?`)) {
      return;
    }

    setRemovingAdminEmail(email);
    setAddAdminError("");
    setAddAdminSuccess("");

    try {
      const res = await fetch("/api/admin/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddAdminError(data.error || "Failed to remove admin");
        return;
      }

      setAddAdminSuccess(`Removed ${data.email} from admins`);
      setAdminRefreshKey((k) => k + 1);
    } catch {
      setAddAdminError("Something went wrong");
    } finally {
      setRemovingAdminEmail(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: imagePrompt.trim(),
          videoPrompt: videoPrompt.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSettingsMessage(`Error: ${data.error || "Failed to save settings"}`);
        return;
      }

      setSettingsMessage("Settings saved successfully!");
    } catch {
      setSettingsMessage("Error: Something went wrong");
    } finally {
      setSettingsSaving(false);
    }
  }

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
        <p className="text-[#888]">Please sign in to access this page.</p>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#888]">Checking permissions...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-2">Access Denied</h1>
          <p className="text-[#888]">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "gallery", label: "Gallery" },
    { id: "photos", label: "Photos" },
    { id: "presets", label: "Presets" },
    { id: "purchases", label: "Purchases" },
    { id: "admins", label: "Admins" },
    { id: "audit", label: "Audit Trail" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl text-[#d4af37] mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#333]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-[#d4af37] border-b-2 border-[#d4af37] -mb-px"
                : "text-[#888] hover:text-[#ededed]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gallery Tab */}
      {activeTab === "gallery" && (
        <>
          <div className="card p-4 mb-8">
            <label className="block text-sm text-[#888] mb-2">Filter by User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full max-w-md p-3"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email || user.clerk_id} ({user.credits} credits)
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-xl text-[#d4af37] mb-4">
              Generations {selectedUserId && `(Filtered)`}
              <span className="text-sm text-[#888] ml-2">
                ({generations.length} total)
              </span>
            </h2>

            <GenerationsGallery
              generations={generations}
              loading={loadingGenerations}
              showUserEmail={true}
              emptyMessage="No generations found."
              columns={4}
            />
          </div>
        </>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && (
        <>
          {/* Upload Form */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl text-[#d4af37] mb-4">Upload Preset Photo</h2>
            <p className="text-[#888] text-sm mb-4">
              Upload images that users can select as reference presets on the generate form.
            </p>
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-2">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  value={photoName}
                  onChange={(e) => setPhotoName(e.target.value)}
                  placeholder="e.g. Vintage Car"
                  className="w-full max-w-md p-3"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-2">
                  Image File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="w-full max-w-md p-3 text-[#ededed] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-[#333] file:text-[#ededed] hover:file:bg-[#444]"
                  required
                />
                <p className="text-xs text-[#666] mt-1">
                  JPEG, PNG, GIF, or WebP. Max 10MB.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={photoUploading}
                  className="btn-primary px-6"
                >
                  {photoUploading ? "Uploading..." : "Upload Photo"}
                </button>
                {photoMessage && (
                  <p
                    className={`text-sm ${
                      photoMessage.startsWith("Error")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {photoMessage}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Photos Grid */}
          <div className="card p-6">
            <h2 className="text-xl text-[#d4af37] mb-2">
              Preset Photos
              <span className="text-sm text-[#888] ml-2">
                ({presetPhotos.length})
              </span>
            </h2>
            <p className="text-[#888] text-sm mb-4">
              Each photo can have a custom prompt that is appended when a user selects it as a reference image.
            </p>

            {presetPromptsMessage && (
              <div
                className={`mb-4 p-3 rounded text-sm ${
                  presetPromptsMessage.startsWith("Error")
                    ? "bg-red-400/10 text-red-400"
                    : "bg-green-400/10 text-green-400"
                }`}
              >
                {presetPromptsMessage}
              </div>
            )}

            {photosLoading ? (
              <p className="text-[#666]">Loading photos...</p>
            ) : presetPhotos.length === 0 ? (
              <p className="text-[#666]">
                No preset photos uploaded yet. Upload photos above to make them
                available as reference images on the generate form.
              </p>
            ) : (
              <div className="space-y-4">
                {presetPhotos.map((photo) => (
                  <div
                    key={photo.key}
                    className="border border-[#333] rounded p-4 flex gap-4"
                  >
                    <div className="flex-shrink-0 w-24 h-24 rounded overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-sm text-[#ededed] truncate"
                          title={photo.name}
                        >
                          {photo.name}
                        </p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button
                            onClick={() => handleSavePresetPrompt(photo.key)}
                            disabled={presetPromptsSaving === photo.key}
                            className="text-sm px-3 py-1 bg-[#d4af37] text-black rounded hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                          >
                            {presetPromptsSaving === photo.key ? "Saving..." : "Save Prompt"}
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.key)}
                            disabled={deletingPhotoKey === photo.key}
                            className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                          >
                            {deletingPhotoKey === photo.key
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#666] mb-2">
                        {photo.size > 1024 * 1024
                          ? `${(photo.size / (1024 * 1024)).toFixed(1)}MB`
                          : `${Math.round(photo.size / 1024)}KB`}
                      </p>
                      <textarea
                        value={presetCustomPrompts[photo.key] || ""}
                        onChange={(e) =>
                          setPresetCustomPrompts((prev) => ({
                            ...prev,
                            [photo.key]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full p-2 resize-none text-sm"
                        placeholder="Custom prompt to append when this photo is selected..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Presets Tab */}
      {activeTab === "presets" && (
        <div className="card p-6">
          <h2 className="text-xl text-[#d4af37] mb-2">Preset Custom Prompts</h2>
          <p className="text-[#888] text-sm mb-6">
            Add a custom prompt that will be appended to each preset when used for generation.
            Leave blank to use the preset as-is.
          </p>

          {presetPromptsMessage && (
            <div
              className={`mb-4 p-3 rounded text-sm ${
                presetPromptsMessage.startsWith("Error")
                  ? "bg-red-400/10 text-red-400"
                  : "bg-green-400/10 text-green-400"
              }`}
            >
              {presetPromptsMessage}
            </div>
          )}

          {presetPromptsLoading ? (
            <p className="text-[#666]">Loading preset prompts...</p>
          ) : (
            <>
            <div className="space-y-6">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="border border-[#333] rounded p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[#ededed] font-medium">
                      {preset.name}
                    </h3>
                    <button
                      onClick={() => handleSavePresetPrompt(preset.id)}
                      disabled={presetPromptsSaving === preset.id}
                      className="text-sm px-4 py-1 bg-[#d4af37] text-black rounded hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                    >
                      {presetPromptsSaving === preset.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <p className="text-xs text-[#666] mb-3 line-clamp-2">
                    Preset prompt: {preset.prompt}
                  </p>
                  <textarea
                    value={presetCustomPrompts[preset.id] || ""}
                    onChange={(e) =>
                      setPresetCustomPrompts((prev) => ({
                        ...prev,
                        [preset.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full p-3 resize-none text-sm"
                    placeholder="Enter custom prompt to append when this preset is used..."
                  />
                </div>
              ))}
            </div>

            {/* Reference Images Custom Prompts */}
            <h2 className="text-xl text-[#d4af37] mt-8 mb-2">Reference Image Custom Prompts</h2>
            <p className="text-[#888] text-sm mb-6">
              Add a custom prompt that will be appended when a user selects one of these reference images.
            </p>
            <div className="space-y-4">
              {referenceImages.map((img) => (
                <div
                  key={img.id}
                  className="border border-[#333] rounded p-4 flex gap-4"
                >
                  <div className="flex-shrink-0 w-24 h-24 rounded overflow-hidden">
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[#ededed] font-medium">{img.name}</h3>
                      <button
                        onClick={() => handleSavePresetPrompt(img.src)}
                        disabled={presetPromptsSaving === img.src}
                        className="text-sm px-4 py-1 bg-[#d4af37] text-black rounded hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                      >
                        {presetPromptsSaving === img.src ? "Saving..." : "Save"}
                      </button>
                    </div>
                    <textarea
                      value={presetCustomPrompts[img.src] || ""}
                      onChange={(e) =>
                        setPresetCustomPrompts((prev) => ({
                          ...prev,
                          [img.src]: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full p-2 resize-none text-sm"
                      placeholder="Custom prompt to append when this image is selected..."
                    />
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}

      {/* Purchases Tab */}
      {activeTab === "purchases" && (
        <div className="card p-6">
          <h2 className="text-xl text-[#d4af37] mb-4">
            Credit Purchases
            <span className="text-sm text-[#888] ml-2">({purchases.length})</span>
          </h2>
          {purchases.length === 0 ? (
            <p className="text-[#666]">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333]">
                    <th className="text-left py-2 px-3 text-[#888]">Date</th>
                    <th className="text-left py-2 px-3 text-[#888]">User</th>
                    <th className="text-right py-2 px-3 text-[#888]">Credits</th>
                    <th className="text-right py-2 px-3 text-[#888]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-[#222]">
                      <td className="py-2 px-3 text-[#666]">
                        {new Date(purchase.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-[#ededed]">
                        {purchase.users?.email || "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-[#d4af37]">
                        +{purchase.credits}
                      </td>
                      <td className="py-2 px-3 text-right text-green-400">
                        ${(purchase.amount_cents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === "admins" && (
        <>
          {/* Add Admin Form */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl text-[#d4af37] mb-4">Add Admin</h2>
            <form onSubmit={handleAddAdmin} className="flex gap-4 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm text-[#888] mb-2">Email Address</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@retromsg.com"
                  className="w-full p-3"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={addAdminLoading || !newAdminEmail}
                className="btn-primary px-6"
              >
                {addAdminLoading ? "Adding..." : "Add Admin"}
              </button>
            </form>
            {addAdminError && (
              <p className="text-red-400 text-sm mt-2">{addAdminError}</p>
            )}
            {addAdminSuccess && (
              <p className="text-green-400 text-sm mt-2">{addAdminSuccess}</p>
            )}
          </div>

          {/* Current Admins List */}
          <div className="card p-6">
            <h2 className="text-xl text-[#d4af37] mb-4">
              Current Admins
              <span className="text-sm text-[#888] ml-2">({admins.length})</span>
            </h2>
            {admins.length === 0 ? (
              <p className="text-[#666]">No admins found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333]">
                      <th className="text-left py-2 px-3 text-[#888]">Email</th>
                      <th className="text-left py-2 px-3 text-[#888]">Added</th>
                      <th className="text-left py-2 px-3 text-[#888]">Added By</th>
                      <th className="text-right py-2 px-3 text-[#888]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id} className="border-b border-[#222]">
                        <td className="py-2 px-3 text-[#ededed]">{admin.email}</td>
                        <td className="py-2 px-3 text-[#666]">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-[#888]">
                          {admin.created_by || "-"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveAdmin(admin.email)}
                            disabled={removingAdminEmail === admin.email}
                            className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                          >
                            {removingAdminEmail === admin.email ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="card p-6">
          <h2 className="text-xl text-[#d4af37] mb-4">Audit Trail</h2>
          {auditLogs.length === 0 ? (
            <p className="text-[#666]">No audit logs yet.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const hasDetails = log.details && (log.details as { old?: string }).old;
                const isExpanded = expandedAuditLog === log.id;
                const details = log.details as { old?: string; new?: string } | null;

                return (
                  <div
                    key={log.id}
                    className={`border border-[#333] rounded p-3 ${
                      hasDetails ? "cursor-pointer hover:border-[#444]" : ""
                    }`}
                    onClick={() => {
                      if (hasDetails) {
                        setExpandedAuditLog(isExpanded ? null : log.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37] text-xs">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[#ededed] text-sm">{log.actor_email}</span>
                      {log.target_email && (
                        <span className="text-[#888] text-sm">→ {log.target_email}</span>
                      )}
                      <span className="text-[#666] text-xs ml-auto">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {hasDetails && (
                        <span className="text-[#888] text-xs">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      )}
                    </div>
                    {hasDetails && !isExpanded && (
                      <div className="mt-2 text-xs text-[#666]">
                        Click to view changes...
                      </div>
                    )}
                    {hasDetails && isExpanded && details && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="text-red-400 text-xs font-medium mb-1">Old:</div>
                          <div className="text-[#888] text-sm bg-[#1a1a1a] p-3 rounded whitespace-pre-wrap break-words">
                            {details.old}
                          </div>
                        </div>
                        <div>
                          <div className="text-green-400 text-xs font-medium mb-1">New:</div>
                          <div className="text-[#ededed] text-sm bg-[#1a1a1a] p-3 rounded whitespace-pre-wrap break-words">
                            {details.new}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="card p-6">
          <h2 className="text-xl text-[#d4af37] mb-4">Default Prompts</h2>
          <p className="text-[#888] text-sm mb-6">
            These prompts are appended to every image or video generation to add
            the vintage film effect.
          </p>

          {settingsLoading ? (
            <p className="text-[#666]">Loading settings...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm text-[#888] mb-2">
                  Image Default Prompt
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 resize-none"
                  placeholder="Enter the default prompt for images..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-2">
                  Video Default Prompt
                </label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 resize-none"
                  placeholder="Enter the default prompt for videos..."
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="btn-primary px-6"
                >
                  {settingsSaving ? "Saving..." : "Save Settings"}
                </button>
                {settingsMessage && (
                  <p
                    className={`text-sm ${
                      settingsMessage.startsWith("Error")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {settingsMessage}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
