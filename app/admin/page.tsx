"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  created_at?: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users");
      const data: any = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function inviteUser() {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const data: any = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "Invite failed");
      }

      setInviteEmail("");
      await loadUsers();
    } catch (e: any) {
      setError(e.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function updateUser(user_id: string, updates: Partial<AdminUser>) {
    setError(null);

    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, ...updates }),
      });

      const data: any = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "Update failed");
      }

      await loadUsers();
    } catch (e: any) {
      setError(e.message || "Update failed");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Staff Users</h1>

        {/* Invite Section */}
        <div
          style={{
            marginTop: 20,
            padding: 20,
            border: "1px solid #222",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
              }}
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
              }}
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>

            <button
              onClick={inviteUser}
              disabled={inviting}
              style={{
                padding: "12px 18px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "#000",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {inviting ? "Inviting..." : "Invite User"}
            </button>

            <button
              onClick={loadUsers}
              style={{
                padding: "12px 18px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 8, opacity: 0.7 }}>
            Invites send an email link. They set their own password from that link.
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "#7f1d1d",
                borderRadius: 8,
                color: "#fff",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div
          style={{
            marginTop: 24,
            border: "1px solid #222",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 16 }}>
            {loading ? "Loading..." : `${users.length} users`}
          </div>

          {!loading && users.length === 0 && (
            <div style={{ padding: 16, opacity: 0.6 }}>
              No admin users found.
            </div>
          )}

          {users.map((u) => (
            <div
              key={u.user_id}
              style={{
                padding: 16,
                borderTop: "1px solid #222",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>{u.email}</div>

              <select
                value={u.role}
                onChange={(e) =>
                  updateUser(u.user_id, { role: e.target.value })
                }
                style={{
                  padding: 8,
                  borderRadius: 6,
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #333",
                }}
              >
                <option value="staff">staff</option>
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: u.active ? "#065f46" : "#7f1d1d",
                }}
              >
                {u.active ? "active" : "inactive"}
              </div>

              <button
                onClick={() =>
                  updateUser(u.user_id, { active: !u.active })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {u.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
