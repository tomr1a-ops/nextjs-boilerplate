"use client";

import { useEffect, useState } from "react";

type DeviceRow = {
  id: string;
  pair_code: string;
  status: string;
  active: boolean;
  device_token?: string | null;
  licensee_id?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  last_seen_at?: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function DevicesClient() {
  const [adminKey, setAdminKey] = useState<string>("");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // optional: remember admin key in this browser
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("imaos_admin_key") : "";
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (adminKey) localStorage.setItem("imaos_admin_key", adminKey);
  }, [adminKey]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/devices", {
        cache: "no-store",
        headers: { "x-admin-key": adminKey },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);

      setDevices(Array.isArray(json?.devices) ? json.devices : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load devices");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "approve" | "revoke") {
    setErr("");
    try {
      const res = await fetch("/api/admin/devices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ id, action }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }

  const pending = devices.filter((d) => String(d.status || "").toLowerCase() === "pending" && d.active !== false);
  const active = devices.filter((d) => String(d.status || "").toLowerCase() === "active" && d.active !== false);
  const revoked = devices.filter((d) => d.active === false || String(d.status || "").toLowerCase() === "revoked");

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 18 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>IMAOS Admin — Devices</div>
          <a href="/admin" style={{ color: "#93c5fd", fontWeight: 900, textDecoration: "none" }}>
            ← Admin Home
          </a>
        </div>

        <div style={{ marginTop: 12, opacity: 0.85 }}>
          This page shows pairing requests from TVs/devices. Approving issues a <b>device_token</b> and activates playback.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter ADMIN_API_KEY"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              width: 360,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 800,
            }}
          />

          <button
            onClick={load}
            disabled={loading || !adminKey}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              opacity: loading || !adminKey ? 0.6 : 1,
            }}
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,0,0,0.12)",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            <b>Error:</b> {err}
          </div>
        ) : null}

        {loading ? <div style={{ marginTop: 14, opacity: 0.7 }}>Loading…</div> : null}

        <Section
          title={`Pending (${pending.length})`}
          rows={pending}
          actions={(d) => (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => act(d.id, "approve")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #1f4d2a",
                  background: "#22c55e",
                  color: "#000",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>
              <button
                onClick={() => act(d.id, "revoke")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#b91c1c",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Revoke
              </button>
            </div>
          )}
        />

        <Section
          title={`Active (${active.length})`}
          rows={active}
          actions={(d) => (
            <button
              onClick={() => act(d.id, "revoke")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#b91c1c",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Revoke
            </button>
          )}
        />

        <Section title={`Revoked (${revoked.length})`} rows={revoked} actions={() => null} />
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  actions,
}: {
  title: string;
  rows: any[];
  actions: (row: any) => React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 18, opacity: 0.9 }}>{title}</div>

      {rows.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.6 }}>None</div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {rows.map((d) => (
            <div
              key={d.id}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 16,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 260 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  Pair code: <span style={{ fontFamily: "monospace" }}>{d.pair_code}</span>
                </div>

                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                  status: <b>{String(d.status || "").toUpperCase()}</b> • active: <b>{String(d.active)}</b>
                </div>

                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  created: {fmt(d.created_at)} • approved: {fmt(d.approved_at)} • last seen: {fmt(d.last_seen_at)}
                </div>

                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  licensee_id: <span style={{ fontFamily: "monospace" }}>{d.licensee_id || "—"}</span>
                </div>

                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  device_token:{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    {d.device_token ? d.device_token.slice(0, 18) + "…" : "—"}
                  </span>
                </div>
              </div>

              <div>{actions(d)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
