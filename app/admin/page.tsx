"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import GenerationsGallery, { Generation } from "@/components/GenerationsGallery";

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

type Tab = "gallery" | "purchases" | "admins" | "audit";

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
    { id: "purchases", label: "Purchases" },
    { id: "admins", label: "Admins" },
    { id: "audit", label: "Audit Trail" },
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
      )}
    </div>
  );
}
