"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Video = {
  id: string;
  label?: string | null;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  created_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null };
  } catch {
    return { ok: res.ok, status: res.status, json: null };
  }
}

export default function VideosClient({ adminKey }: { adminKey: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newPlaybackId, setNewPlaybackId] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "x-admin-key": adminKey };

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/videos", { cache: "no-store", headers });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || `Failed (${out.status})`); return; }
      setVideos(out.json?.videos || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!newLabel.trim()) return setErr("Label is required");
    if (!newPlaybackId.trim()) return setErr("Playback ID is required");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ label: newLabel.trim(), playback_id: newPlaybackId.trim() }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || "Save failed"); return; }
      setNewLabel(""); setNewPlaybackId(""); setShowAdd(false);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editVideo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/videos?id=${editVideo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ label: editVideo.label, active: editVideo.active }),
      });
      const out = await safeJson(res);
      if (!out.ok) { setErr(out.json?.error || "Update failed"); return; }
      setEditVideo(null);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this video?")) return;
    try {
      await fetch(`/api/admin/videos?id=${id}`, { method: "DELETE", headers });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    }
  }

  async function toggleActive(video: Video) {
    try {
      await fetch(`/api/admin/videos?id=${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ active: !video.active }),
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: "1px solid #333", background: "#0f0f0f", color: "#fff", outline: "none", fontSize: 15,
  };

  return (
    <div>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>IMAOS Admin</h1>
          <div style={{ marginTop: 4, opacity: 0.7, fontSize: 13 }}>Video Library</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin" style={{ color: "#7dd3fc", textDecoration: "none", fontSize: 15 }}>Dashboard</Link>
          <Link href="/admin/licensees" style={{ color: "#7dd3fc", textDecoration: "none", fontSize: 15 }}>Licensees</Link>
          <Link href="/admin/users" style={{ color: "#a78bfa", textDecoration: "none", fontSize: 15 }}>Users</Link>
          <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 700 }}>Videos</span>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ opacity: 0.7 }}>{loading ? "Loading..." : `${videos.length} video(s)`}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={refresh} disabled={loading} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Refresh
          </button>
          <button onClick={() => { setShowAdd(true); setErr(""); }} style={{ padding: "10px 22px", borderRadius: 10, border: "2px solid #1f4d2a", background: "#22c55e", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
            + Add Video
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: "1px solid #7f1d1d", background: "#2a0f10", color: "#fecaca", fontWeight: 700 }}>
          {err}
        </div>
      )}

      {/* Table */}
      {videos.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.6 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 18 }}>No videos yet. Click "+ Add Video" to get started.</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#111" }}>
              {["Label", "Playback ID", "Status", "Created", "", ""].map((h, i) => (
                <th key={i} style={{ textAlign: "left", padding: "12px", fontWeight: 900, borderBottom: "1px solid #222" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid #1a1a1a", opacity: v.active ? 1 : 0.5 }}>
                <td style={{ padding: 12, fontWeight: 800, fontSize: 16 }}>{v.label || "—"}</td>
                <td style={{ padding: 12, fontFamily: "ui-monospace, monospace", fontSize: 12, opacity: 0.7, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.playback_id || "—"}</td>
                <td style={{ padding: 12, fontWeight: 900, color: v.active ? "#22c55e" : "#f97316" }}>{v.active ? "ACTIVE" : "INACTIVE"}</td>
                <td style={{ padding: 12, opacity: 0.6 }}>{v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditVideo({ ...v }); setErr(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => toggleActive(v)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #333", background: v.active ? "#111827" : "#7c2d12", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{v.active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => handleDelete(v.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #7f1d1d", background: "#991b1b", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }} onClick={() => setShowAdd(false)}>
          <div style={{ width: "min(500px, 96vw)", background: "#0b0b0b", border: "2px solid #22c55e", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(34,197,94,0.3)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 22, fontWeight: 900, color: "#22c55e" }}>Add Video</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Label <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. AL1V1" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Mux Playback ID <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={newPlaybackId} onChange={e => setNewPlaybackId(e.target.value)} placeholder="From Mux dashboard → Assets" style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }} />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>Find this in your Mux dashboard under Assets</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, background: saving ? "#14532d" : "#22c55e", color: "#000", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save Video"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editVideo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }} onClick={() => setEditVideo(null)}>
          <div style={{ width: "min(500px, 96vw)", background: "#0b0b0b", border: "2px solid #3b82f6", borderRadius: 16, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 22, fontWeight: 900, color: "#3b82f6" }}>Edit Video</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Label</label>
                <input value={editVideo.label || ""} onChange={e => setEditVideo({ ...editVideo, label: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 }}>Playback ID (read only)</label>
                <input value={editVideo.playback_id || ""} disabled style={{ ...inputStyle, opacity: 0.5, fontFamily: "ui-monospace, monospace" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Active</span>
                <button onClick={() => setEditVideo({ ...editVideo, active: !editVideo.active })} style={{ padding: "6px 16px", borderRadius: 8, background: editVideo.active ? "#22c55e" : "#374151", color: editVideo.active ? "#000" : "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
                  {editVideo.active ? "Yes" : "No"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditVideo(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #333", background: "#1b1b1b", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEdit} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, background: saving ? "#1e3a8a" : "#3b82f6", color: "#fff", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
