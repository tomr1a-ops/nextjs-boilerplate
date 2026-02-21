"use client";

import React, { useEffect, useMemo, useState } from "react";

type AdminUser = {
  user_id: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | string;
  active: boolean;
  created_at?: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;

  // If an error page/html is returned, don't JSON.parse it
  const looksLikeHtml = text.trim().startsWith("<!doctype") || text.trim().startsWith("<html");
  if (looksLikeHtml) return { error: "Server returned HTML instead of JSON", raw: text };

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid JSON response", raw: text };
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin" | "super_admin">("staff");

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  }, [users]);

  async function loadUsers() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) {
        setErr(data?.error || `Failed to load users (${res.status})`);
        setUsers([]);
        return;
      }

      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function inviteUser() {
    setErr("");
    setMsg("");

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      setErr("Enter an email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: cleanEmail, role }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setErr(data?.error || `Invite failed (${res.status})`);
        return;
      }

      setMsg(`Invite sent to ${cleanEmail}`);
      setEmail("");
      await loadUsers();
    } catch (e: any) {
      setErr(e?.message || "Invite failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(u: AdminUser) {
    setErr("");
    setMsg("");

    const ok = confirm(`Permanently delete ${u.email}?\n\nThis removes them from Supabase Auth and admin_users.`);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ user_id: u.user_id }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setErr(data?.error || `Delete failed (${res.status})`);
        return;
      }

      setMsg(`Deleted ${u.email}`);
      await loadUsers();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Staff Users</h1>

        <div style={{ marginTop: 10, opacity: 0.8 }}>
          Invites send an email link. They set their own password from that link.
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #2b2b2b",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@imaimpact.com"
            style={{
              flex: "1 1 380px",
              minWidth: 260,
              padding: "14px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#eaf2ff",
              color: "#111",
              fontSize: 16,
              outline: "none",
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              fontSize: 16,
              minWidth: 140,
            }}
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>

          <button
            onClick={inviteUser}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #14532d",
              background: "#16a34a",
              color: "#001a07",
              fontWeight: 900,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              minWidth: 140,
            }}
          >
            Invite User
          </button>

          <button
            onClick={loadUsers}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              minWidth: 120,
            }}
          >
            Refresh
          </button>

          {err ? (
            <div
              style={{
                width: "100%",
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(220,38,38,0.4)",
                color: "#fecaca",
                fontWeight: 700,
              }}
            >
              {err}
            </div>
          ) : null}

          {msg ? (
            <div
              style={{
                width: "100%",
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.35)",
                color: "#bbf7d0",
                fontWeight: 700,
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #2b2b2b",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ opacity: 0.85, marginBottom: 12 }}>
            {loading ? "Loading..." : `${sortedUsers.length} user${sortedUsers.length === 1 ? "" : "s"}`}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.75 }}>
                  <th style={{ padding: "10px 8px" }}>Email</th>
                  <th style={{ padding: "10px 8px" }}>Role</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 14, opacity: 0.75 }}>
                      No admin users found.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => (
                    <tr key={u.user_id} style={{ borderTop: "1px solid #222" }}>
                      <td style={{ padding: "12px 8px" }}>{u.email}</td>

                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #333",
                            background: "#111",
                            fontWeight: 800,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${u.active ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"}`,
                            background: u.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: u.active ? "#bbf7d0" : "#fecaca",
                            fontWeight: 900,
                          }}
                        >
                          {u.active ? "active" : "inactive"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 8px" }}>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={loading}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #7f1d1d",
                            background: "#7f1d1d",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
                          title="Permanently delete this user"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            Delete removes the user from Supabase Auth and the admin_users table.
          </div>
        </div>
      </div>
    </div>
  );
}
