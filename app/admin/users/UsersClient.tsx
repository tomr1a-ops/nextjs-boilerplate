"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

export default function UsersClient({ adminKey }: { adminKey: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  const adminHeaders = { "x-admin-key": adminKey };

  async function loadUsers() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: adminHeaders,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      const json = await res.json();
      setUsers(Array.isArray(json?.users) ? json.users : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    if (!email.trim() || !password.trim()) {
      setErr("Email and password required");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ email: email.trim(), password: password.trim(), role }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      setEmail("");
      setPassword("");
      setRole("staff");
      await loadUsers();
    } catch (e: any) {
      setErr(e?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      await loadUsers();
    } catch (e: any) {
      setErr(e?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: string) {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      await loadUsers();
    } catch (e: any) {
      setErr(e?.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Admin Users</h1>

      {err && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #7f1d1d",
            background: "#2a0f10",
            color: "#fecaca",
            fontWeight: 800,
          }}
        >
          {err}
        </div>
      )}

      {/* Create User Form */}
      <div
        style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          border: "1px solid #333",
          background: "#0f0f0f",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>Create New User</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 20 }}>
          User will be created with these credentials. They can change their password after logging in.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 250px" }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.9 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0b0b0b",
                color: "#fff",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.9 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0b0b0b",
                color: "#fff",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "0 0 150px" }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.9 }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0b0b0b",
                color: "#fff",
                fontSize: 14,
              }}
            >
              <option value="staff">Staff</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <button
            onClick={createUser}
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1px solid #1f4d2a",
              background: loading || !email.trim() || !password.trim() ? "#14532d" : "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: loading || !email.trim() || !password.trim() ? "not-allowed" : "pointer",
            }}
          >
            Create User
          </button>

          <button
            onClick={loadUsers}
            disabled={loading}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#141414",
              color: "#fff",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Users List */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
          {users.length} user{users.length !== 1 ? "s" : ""}
        </div>

        {users.length === 0 ? (
          <div style={{ opacity: 0.7, padding: 24, textAlign: "center" }}>No users found</div>
        ) : (
          <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: 12,
                padding: 12,
                background: "#111",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              <div>Email</div>
              <div>Role</div>
              <div>Active</div>
              <div>Actions</div>
            </div>

            {/* Table Rows */}
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: 12,
                  padding: 12,
                  borderTop: "1px solid #222",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700 }}>{user.email}</div>

                <div>
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={loading}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #333",
                      background: "#0b0b0b",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <option value="staff">staff</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>

                <div>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      background: user.active ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: user.active ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {user.active ? "active" : "inactive"}
                  </span>
                </div>

                <div>
                  <button
                    onClick={() => toggleActive(user.id, user.active)}
                    disabled={loading}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "1px solid #333",
                      background: user.active ? "#7f1d1d" : "#14532d",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
