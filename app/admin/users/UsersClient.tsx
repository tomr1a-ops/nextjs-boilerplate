"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUserRow = {
  user_id: string;
  email?: string | null;
  role: string;
  active: boolean;
  created_at?: string | null;
};

export default function UsersClient() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ar = (a.role || "").toLowerCase();
      const br = (b.role || "").toLowerCase();
      if (ar !== br) return ar.localeCompare(br);
      const ae = (a.email || "").toLowerCase();
      const be = (b.email || "").toLowerCase();
      return ae.localeCompare(be);
    });
  }, [rows]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load users");
      setRows(j.users || []);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function invite() {
    setErr(null);
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErr("Enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: clean, role }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Invite failed");
      setEmail("");
      await refresh();
      alert("Invite sent. They’ll receive an email to set their password.");
    } catch (e: any) {
      setErr(e?.message || "Invite failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user_id: string, active: boolean) {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, active }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Update failed");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(user_id: string, newRole: string) {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, role: newRole }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Update failed");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
        Staff Users
      </h1>

      <div
        style={{
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@imaimpact.com"
            style={{
              flex: "1 1 320px",
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "#0b0b0b",
              color: "white",
              outline: "none",
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              padding: "12px 10px",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "#0b0b0b",
              color: "white",
              outline: "none",
            }}
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>

          <button
            onClick={invite}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: "#1fbf5b",
              color: "#000",
              fontWeight: 800,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Invite User
          </button>

          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "#1a1a1a",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#bbb", fontSize: 13 }}>
          Invites send an email link. They set their own password from that link.
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              background: "#2a0c0c",
              border: "1px solid #5c1c1c",
              color: "#ffd1d1",
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div
        style={{
          background: "#0f0f0f",
          border: "1px solid #2a2a2a",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #2a2a2a", color: "#ccc" }}>
          {loading ? "Loading…" : `${sorted.length} users`}
        </div>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#111" }}>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Active</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.user_id} style={{ borderTop: "1px solid #1f1f1f" }}>
                  <td style={td}>{u.email || <span style={{ color: "#777" }}>(unknown)</span>}</td>
                  <td style={td}>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.user_id, e.target.value)}
                      disabled={loading}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#0b0b0b",
                        color: "white",
                        outline: "none",
                      }}
                    >
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: u.active ? "#0e2a14" : "#2a0c0c",
                        border: `1px solid ${u.active ? "#1fbf5b" : "#5c1c1c"}`,
                        color: u.active ? "#9ff0b9" : "#ffd1d1",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {u.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td style={td}>
                    {u.active ? (
                      <button
                        onClick={() => toggleActive(u.user_id, false)}
                        disabled={loading}
                        style={btnDark}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleActive(u.user_id, true)}
                        disabled={loading}
                        style={btnGreen}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 18, color: "#777" }}>
                    No admin users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  color: "#bbb",
  fontSize: 13,
  fontWeight: 800,
};

const td: React.CSSProperties = {
  padding: 12,
  color: "white",
  fontSize: 14,
};

const btnDark: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #2a2a2a",
  background: "#1a1a1a",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const btnGreen: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#1fbf5b",
  color: "#000",
  fontWeight: 900,
  cursor: "pointer",
};
