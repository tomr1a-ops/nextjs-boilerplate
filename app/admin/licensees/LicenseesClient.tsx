"use client";

import { useEffect, useMemo, useState } from "react";

type Licensee = {
  id: string;
  name?: string | null;
  email?: string | null;
  code?: string | null; // IMPORTANT: this is the player login code
  created_at?: string | null;
};

type Video = {
  id: string;
  title?: string | null;
  name?: string | null;
  created_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return {
      ok: res.ok,
      status: res.status,
      json: text ? JSON.parse(text) : null,
      text,
    };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

export default function LicenseesClient() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Licensee | null>(null);

  const [assigned, setAssigned] = useState<Record<string, boolean>>({}); // video_id -> checked
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const canCreate = useMemo(() => name.trim().length > 0 && code.trim().length > 0, [name, code]);

  async function refreshLicensees() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licensees", { cache: "no-store" });
      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Request failed (${out.status})`);
        setLicensees([]);
        return;
      }
      const list = out.json?.licensees || out.json?.data || out.json?.items || [];
      setLicensees(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load licensees");
      setLicensees([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshVideos() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/videos", { cache: "no-store" });
      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Request failed (${out.status})`);
        setVideos([]);
        return;
      }
      const list = out.json?.videos || out.json?.data || out.json?.items || [];
      setVideos(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignments(licensee_id: string) {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/licensee-videos?licensee_id=${encodeURIComponent(licensee_id)}`, {
        cache: "no-store",
      });
      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Assignments failed (${out.status})`);
        setAssigned({});
        return;
      }
      const ids: string[] = Array.isArray(out.json?.video_ids) ? out.json.video_ids : [];
      const map: Record<string, boolean> = {};
      ids.forEach((id) => (map[id] = true));
      setAssigned(map);
    } catch (e: any) {
      setErr(e?.message || "Failed to load assignments");
      setAssigned({});
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignments() {
    if (!selected) return;
    setErr("");
    setSaving(true);
    try {
      const video_ids = Object.entries(assigned)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/admin/licensee-videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensee_id: selected.id, video_ids }),
      });
      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Save failed (${out.status})`);
        return;
      }
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
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
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          code: code.trim(), // REQUIRED
        }),
      });
      const out = await safeJson(res);
      if (!out.ok) {
        setErr(out.json?.error || out.text || `Create failed (${out.status})`);
        return;
      }

      setName("");
      setEmail("");
      setCode("");
      await refreshLicensees();
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
      if (selected?.id === id) {
        setSelected(null);
        setAssigned({});
      }
      await refreshLicensees();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(video_id: string) {
    setAssigned((prev) => ({ ...prev, [video_id]: !prev[video_id] }));
  }

  useEffect(() => {
    // load both lists on mount
    refreshLicensees();
    refreshVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
      {/* LEFT: LICENSEES */}
      <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#111", fontWeight: 900 }}>Licensees</div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
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
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Licensee Code (player login)"
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
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                refreshLicensees();
                refreshVideos();
              }}
              disabled={loading}
              style={{
                padding: "10px 14px",
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
            <div style={{ opacity: 0.75, alignSelf: "center" }}>
              {loading ? "Loading..." : `${licensees.length} licensee(s)`}
            </div>
          </div>

          {err ? (
            <div
              style={{
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
        </div>

        <div style={{ borderTop: "1px solid #222" }}>
          {licensees.map((x) => {
            const isSel = selected?.id === x.id;
            return (
              <div
                key={x.id}
                style={{
                  padding: 12,
                  borderTop: "1px solid #222",
                  background: isSel ? "#141414" : "transparent",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelected(x);
                    loadAssignments(x.id);
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{x.name || "—"}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    code: <b>{x.code || "—"}</b> &nbsp; | &nbsp; {x.email || "—"}
                  </div>
                </div>

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
            );
          })}

          {licensees.length === 0 && !loading ? (
            <div style={{ padding: 14, opacity: 0.7 }}>No licensees found.</div>
          ) : null}
        </div>
      </div>

      {/* RIGHT: VIDEOS + CHECKMARKS */}
      <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#111", fontWeight: 900 }}>
          Video Access {selected ? `— ${selected.name} (${selected.code})` : ""}
        </div>

        {!selected ? (
          <div style={{ padding: 14, opacity: 0.75 }}>
            Select a licensee on the left to assign which videos they can see in the player.
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={saveAssignments}
                disabled={saving || loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #1f4d2a",
                  background: saving || loading ? "#14532d" : "#22c55e",
                  color: "#000",
                  fontWeight: 900,
                  cursor: saving || loading ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Assignments"}
              </button>

              <div style={{ opacity: 0.75 }}>
                {videos.length} total video(s) —{" "}
                {Object.values(assigned).filter(Boolean).length} assigned
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid #222" }}>
              {videos.map((v) => {
                const title = v.title || v.name || v.id;
                const checked = !!assigned[v.id];
                return (
                  <label
                    key={v.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: 12,
                      borderTop: "1px solid #222",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(v.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ fontWeight: 800 }}>{title}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
                      {v.created_at ? new Date(v.created_at).toLocaleString() : ""}
                    </div>
                  </label>
                );
              })}

              {videos.length === 0 && !loading ? (
                <div style={{ padding: 14, opacity: 0.7 }}>No videos found.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
