"use client";

import { useEffect, useMemo, useState } from "react";

type Video = {
  id: string;
  label?: string | null;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
};

type Licensee = {
  id: string;
  name?: string | null;
  code?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null, text };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

export default function PlayerPage() {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [licensee, setLicensee] = useState<Licensee | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  const canLoad = useMemo(() => code.trim().length > 0, [code]);

  useEffect(() => {
    // optional: remember last code
    const saved = localStorage.getItem("imaos_licensee_code") || "";
    if (saved) setCode(saved);
  }, []);

  async function loadVideos() {
    const c = code.trim().toUpperCase();
    if (!c) return;

    setErr("");
    setLoading(true);
    setLicensee(null);
    setVideos([]);

    try {
      localStorage.setItem("imaos_licensee_code", c);

      const res = await fetch(`/api/player/videos?code=${encodeURIComponent(c)}`, { cache: "no-store" });
      const out = await safeJson(res);

      if (!out.ok) {
        setErr(out.json?.error || out.text || `Request failed (${out.status})`);
        return;
      }

      setLicensee(out.json?.licensee || null);
      setVideos(Array.isArray(out.json?.videos) ? out.json.videos : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>IMAOS Player</h1>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Enter a licensee code (example: <b>AT100</b>) to load allowed videos.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Licensee Code (e.g. AT100)"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
              width: 260,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              textTransform: "uppercase",
            }}
          />
          <button
            onClick={loadVideos}
            disabled={loading || !canLoad}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #1f4d2a",
              background: loading || !canLoad ? "#14532d" : "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: loading || !canLoad ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Load Videos"}
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

        {licensee ? (
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            Loaded for <b>{licensee.name || "Licensee"}</b> —{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {licensee.code}
            </span>
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          {videos.length === 0 && licensee ? (
            <div style={{ opacity: 0.8 }}>No videos assigned to this licensee yet.</div>
          ) : null}

          {videos.length > 0 ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {videos.map((v) => (
                <div
                  key={v.id}
                  style={{
                    border: "1px solid #222",
                    borderRadius: 14,
                    padding: 14,
                    background: "#0f0f0f",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{v.label || v.id}</div>
                  <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
                    playback_id:{" "}
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {v.playback_id || "—"}
                    </span>
                  </div>

                  {/* Placeholder “Play” button — we’ll wire Mux playback next */}
                  <button
                    disabled={!v.playback_id}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#e2e8f0",
                      fontWeight: 900,
                      cursor: v.playback_id ? "pointer" : "not-allowed",
                    }}
                    onClick={() => alert(`Next step: play ${v.label} (${v.playback_id})`)}
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
