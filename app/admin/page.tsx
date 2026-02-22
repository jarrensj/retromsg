"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

type User = {
  id: string;
  clerk_id: string;
  email: string;
  credits: number;
  created_at: string;
};

type Generation = {
  id: string;
  prompt: string;
  source_url: string | null;
  result_url: string;
  type: "image" | "video";
  created_at: string;
  user_id: string;
  users: {
    email: string;
    clerk_id: string;
  };
};

type AuditLog = {
  id: string;
  action: string;
  actor_email: string;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState("");
  const [addAdminSuccess, setAddAdminSuccess] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

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
  }, [isAdmin, addAdminSuccess]);

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
    } catch {
      setAddAdminError("Something went wrong");
    } finally {
      setAddAdminLoading(false);
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl text-[#d4af37] mb-8">Admin Panel</h1>

      {/* User Filter */}
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

      {/* Generations Grid */}
      <div className="mb-12">
        <h2 className="text-xl text-[#d4af37] mb-4">
          Generations {selectedUserId && `(Filtered)`}
          <span className="text-sm text-[#888] ml-2">
            ({generations.length} total)
          </span>
        </h2>

        {loadingGenerations ? (
          <p className="text-[#888]">Loading generations...</p>
        ) : generations.length === 0 ? (
          <p className="text-[#666]">No generations found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    <span className="text-xs text-[#666]">
                      {new Date(gen.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mb-1 truncate" title={gen.users?.email}>
                    {gen.users?.email || "Unknown user"}
                  </p>
                  <p className="text-sm text-[#888] truncate" title={gen.prompt}>
                    {gen.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Admin Section */}
      <div className="card p-6 mb-8">
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

      {/* Audit Trail */}
      <div className="card p-6">
        <h2 className="text-xl text-[#d4af37] mb-4">Audit Trail</h2>
        {auditLogs.length === 0 ? (
          <p className="text-[#666]">No audit logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left py-2 px-3 text-[#888]">Date</th>
                  <th className="text-left py-2 px-3 text-[#888]">Action</th>
                  <th className="text-left py-2 px-3 text-[#888]">Actor</th>
                  <th className="text-left py-2 px-3 text-[#888]">Target</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[#222]">
                    <td className="py-2 px-3 text-[#666]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37] text-xs">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#ededed]">{log.actor_email}</td>
                    <td className="py-2 px-3 text-[#888]">{log.target_email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
