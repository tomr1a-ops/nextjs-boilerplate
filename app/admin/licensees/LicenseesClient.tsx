"use client";

import { useEffect, useMemo, useState } from "react";

type Licensee = {
  id: string;
  name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null, text };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

export default function LicenseesClient() {
  const [items, setItems] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licensees", { cache: "no-store" });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Request failed (${out.status})`);
        setItems([]);
        return;
      }

      const list = out.json?.licensees || out.json?.data || out.json?.items || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load licensees");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function createLicensee() {
    if (!canCreate) return;
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licensees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null }),
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Create failed (${out.status})`);
        return;
      }

      setName("");
      setEmail("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLicensee(id: string) {
    if (!confirm("Delete this licensee? This cannot be undone.")) return;
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/licensees?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Delete failed (${out.status})`);
        return;
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Licensee name (required)"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#0f0f0f",
            color: "#fff",
            outline: "none",
          }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#0f0f0f",
            color: "#fff",
            outline: "none",
          }}
        />
        <button
          onClick={createLicensee}
          disabled={loading || !canCreate}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #1f4d2a",
            background: loading || !canCreate ? "#14532d" : "#22c55e",
            color: "#000",
            fontWeight: 900,
            cursor: loading || !canCreate ? "not-allowed" : "pointer",
          }}
        >
          Add
        </button>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#1b1b1b",
            color: "#fff",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #7f1d1d",
            background: "#2a0f10",
            color: "#fecaca",
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, opacity: 0.85, fontSize: 14 }}>
        {loading ? "Loading..." : `${items.length} licensee(s)`}
      </div>

      <div style={{ marginTop: 10, border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 0, padding: 12, background: "#111" }}>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Name</div>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Email</div>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Created</div>
          <div />
        </div>

        {items.map((x) => (
          <div
            key={x.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr auto",
              padding: 12,
              borderTop: "1px solid #222",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{x.name || "—"}</div>
            <div style={{ opacity: 0.9 }}>{x.email || "—"}</div>
            <div style={{ opacity: 0.7 }}>{x.created_at ? new Date(x.created_at).toLocaleString() : "—"}</div>
            <button
              onClick={() => deleteLicensee(x.id)}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #7f1d1d",
                background: "#991b1b",
                color: "#fff",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}

        {items.length === 0 && !loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>No licensees found.</div>
        ) : null}
      </div>
    </div>
  );
}
