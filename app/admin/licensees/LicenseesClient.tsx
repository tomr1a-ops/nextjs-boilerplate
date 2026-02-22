"use client";

import { useEffect, useMemo, useState } from "react";

type Licensee = {
  id: string;
  code?: string | null;
  name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

type Video = {
  id: string;
  label?: string | null;       // ← THIS matches your API
  playback_id?: string | null; // ← THIS matches your API
  sort_order?: number | null;
  active?: boolean | null;
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

function normLabel(v: unknown) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

export default function LicenseesClient({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");

  // video assignment modal state
  const [showVideosFor, setShowVideosFor] = useState<Licensee | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  // checked is keyed by VIDEO LABEL (slug uppercased), not video id
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [savingVideos, setSavingVideos] = useState(false);
  const [videosErr, setVideosErr] = useState("");

  const canCreate = useMemo(() => name.trim().length > 0 && code.trim().length > 0, [name, code]);

  const adminHeaders = useMemo(() => ({ "x-admin-key": adminKey }), [adminKey]);

  async function refresh() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/licensees", {
        cache: "no-store",
        headers: adminHeaders,
      });
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
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          email: email.trim() || null,
        }),
      });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Create failed (${out.status})`);
        return;
      }

      setName("");
      setCode("");
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
        headers: adminHeaders,
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

  async function openVideosModal(licensee: Licensee) {
    setVideosErr("");
    setShowVideosFor(licensee);
    setSavingVideos(false);
    setAllVideos([]);
    setChecked({});

    try {
      // 1) Load all videos
      const resVideos = await fetch(`/api/admin/videos`, {
        cache: "no-store",
        headers: adminHeaders,
      });
      const outVideos = await safeJson(resVideos);

      if (!outVideos.ok) {
        setVideosErr(outVideos.json?.error || outVideos.text || `Videos load failed (${outVideos.status})`);
        return;
      }

      const vids: Video[] = Array.isArray(outVideos.json?.videos)
        ? outVideos.json.videos
        : Array.isArray(outVideos.json?.data)
        ? outVideos.json.data
        : Array.isArray(outVideos.json)
        ? outVideos.json
        : [];

      setAllVideos(vids);

      // 2) Load assigned labels for this licensee
      const resAssigned = await fetch(`/api/admin/licensees/${encodeURIComponent(licensee.id)}/videos`, {
        cache: "no-store",
        headers: adminHeaders,
      });
      const outAssigned = await safeJson(resAssigned);

      if (!outAssigned.ok) {
        setVideosErr(outAssigned.json?.error || outAssigned.text || `Assigned load failed (${outAssigned.status})`);
        return;
      }

      // CURRENT TRUTH: { licensee_id, video_labels: ["A1V1", "A1V2"] }
      const assignedLabels: string[] = Array.isArray(outAssigned.json?.video_labels) ? outAssigned.json.video_labels : [];
      const assignedSet = new Set(assignedLabels.map(normLabel));

      // 3) Build checkbox map keyed by slug(label)
      const map: Record<string, boolean> = {};
      for (const v of vids) {
        const label = normLabel(v.slug);
        if (!label) continue;
        map[label] = assignedSet.has(label);
      }
      setChecked(map);
    } catch (e: any) {
      setVideosErr(e?.message || "Failed to load videos");
    }
  }

  function toggleVideo(label: string) {
    const key = normLabel(label);
    if (!key) return;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveVideos() {
    if (!showVideosFor) return;

    setVideosErr("");
    setSavingVideos(true);

    try {
      const selectedLabels = Object.entries(checked)
        .filter(([, v]) => v)
        .map(([k]) => normLabel(k))
        .filter(Boolean);

      const res = await fetch(`/api/admin/licensees/${encodeURIComponent(showVideosFor.id)}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ video_labels: selectedLabels }),
      });

      const out = await safeJson(res);

      if (!out.ok) {
        setVideosErr(out.json?.error || out.text || `Save failed (${out.status})`);
        return;
      }

      setShowVideosFor(null);
    } catch (e: any) {
      setVideosErr(e?.message || "Save failed");
    } finally {
      setSavingVideos(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 10 }}>
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
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Licensee code (required) e.g. AT100"
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

      <div style={{ marginTop: 14, opacity: 0.85, fontSize: 14 }}>{loading ? "Loading..." : `${items.length} licensee(s)`}</div>

      <div style={{ marginTop: 10, border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 2fr 1fr auto auto",
            gap: 0,
            padding: 12,
            background: "#111",
          }}
        >
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Name</div>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Code</div>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Email</div>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Created</div>
          <div />
          <div />
        </div>

        {items.map((x) => (
          <div
            key={x.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 2fr 1fr auto auto",
              padding: 12,
              borderTop: "1px solid #222",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{x.name || "—"}</div>
            <div style={{ opacity: 0.9, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {x.code || "—"}
            </div>
            <div style={{ opacity: 0.9 }}>{x.email || "—"}</div>
            <div style={{ opacity: 0.7 }}>{x.created_at ? new Date(x.created_at).toLocaleString() : "—"}</div>

            <button
              onClick={() => openVideosModal(x)}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#e2e8f0",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Videos
            </button>

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

        {items.length === 0 && !loading ? <div style={{ padding: 14, opacity: 0.7 }}>No licensees found.</div> : null}
      </div>

      {/* Videos Modal */}
      {showVideosFor ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => (savingVideos ? null : setShowVideosFor(null))}
        >
          <div
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#0b0b0b",
              border: "1px solid #222",
              borderRadius: 16,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Assign Videos</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {showVideosFor.name || "Licensee"} —{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {showVideosFor.code || "NO_CODE"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowVideosFor(null)}
                  disabled={savingVideos}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#1b1b1b",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: savingVideos ? "not-allowed" : "pointer",
                  }}
                >
                  Close
                </button>

                <button
                  onClick={saveVideos}
                  disabled={savingVideos}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #1f4d2a",
                    background: savingVideos ? "#14532d" : "#22c55e",
                    color: "#000",
                    fontWeight: 900,
                    cursor: savingVideos ? "not-allowed" : "pointer",
                  }}
                >
                  {savingVideos ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {videosErr ? (
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
                {videosErr}
              </div>
            ) : null}

            <div style={{ marginTop: 14, borderTop: "1px solid #222", paddingTop: 12 }}>
              {allVideos.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No videos found. Add videos first in Videos admin (confirm /api/admin/videos returns data).</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {allVideos.map((v) => {
                    const label = normLabel(v.slug);
                    if (!label) return null;

                    return (
                      <label
                        key={v.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: 12,
                          border: "1px solid #222",
                          borderRadius: 12,
                          background: "#0f0f0f",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!checked[label]}
                          onChange={() => toggleVideo(label)}
                          disabled={savingVideos}
                          style={{ width: 18, height: 18 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900 }}>
                            {v.title || v.slug || v.id}
                            {v.active === false ? <span style={{ marginLeft: 8, opacity: 0.7 }}>(inactive)</span> : null}
                          </div>
                          <div style={{ opacity: 0.75, marginTop: 2, fontSize: 13 }}>
                            label: {label} • mux_playback_id: {v.mux_playback_id || "—"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
