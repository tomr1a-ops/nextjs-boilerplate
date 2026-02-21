"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  user_id: string;
  email: string;
  role: "super_admin" | "admin" | "staff";
  active: boolean;
  created_at?: string;
};

export default function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("staff");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  async function refresh() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load users");
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 8;
  }, [email, password]);

  async function createUser() {
    setError("");
    setOk("");
    if (!canSubmit) {
      setError("Enter an email and a password (8+ chars).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          active: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create failed");

      setOk(`Created ${data?.created || email}. Tell them the password you set.`);
      setEmail("");
      setPassword("");
      setRole("staff");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user_id: string, email: string) {
    const sure = confirm(
      `Delete ${email}?\n\nThis permanently removes the user from Supabase Auth AND admin_users.`
    );
    if (!sure) return;

    setError("");
    setOk("");
    setBusyId(user_id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      setOk(`Deleted ${email}`);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Staff Users</h1>
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          No invite emails. You set the password here and tell them.
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid #222",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px 220px 160px", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@imaimpact.com"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
                outline: "none",
                fontSize: 16,
              }}
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password (8+ chars)"
              type="text"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
                outline: "none",
                fontSize: 16,
              }}
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser["role"])}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
                outline: "none",
                fontSize: 16,
              }}
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>

            <button
              onClick={createUser}
              disabled={loading || !canSubmit}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: "0",
                background: loading || !canSubmit ? "#1f6f3a" : "#16a34a",
                color: "#000",
                fontWeight: 900,
                fontSize: 16,
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
              }}
            >
              Create User
            </button>
          </div>

          {error ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#3b0a0a", border: "1px solid #6b1111" }}>
              {error}
            </div>
          ) : null}

          {ok ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#052e16", border: "1px solid #14532d" }}>
              {ok}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#121212",
                color: "#fff",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Refresh
            </button>
            <div style={{ opacity: 0.7, alignSelf: "center" }}>
              {loading ? "Loading..." : `${users.length} users`}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 140px 180px", padding: 14, background: "rgba(255,255,255,0.03)", fontWeight: 900 }}>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {users.map((u) => (
            <div
              key={u.user_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 220px 140px 180px",
                padding: 14,
                borderTop: "1px solid #222",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>{u.email}</div>

              <div style={{ fontSize: 14, opacity: 0.9 }}>{u.role}</div>

              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid " + (u.active ? "#14532d" : "#7f1d1d"),
                    background: u.active ? "#052e16" : "#3b0a0a",
                    color: u.active ? "#86efac" : "#fecaca",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {u.active ? "active" : "inactive"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => deleteUser(u.user_id, u.email)}
                  disabled={busyId === u.user_id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #6b1111",
                    background: "#3b0a0a",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: busyId === u.user_id ? "not-allowed" : "pointer",
                  }}
                >
                  {busyId === u.user_id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.7 }}>No admin users found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
