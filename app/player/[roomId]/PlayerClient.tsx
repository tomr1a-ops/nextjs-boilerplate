"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type PlayerVideo = {
  id: string;
  label: string;
  playback_id: string;
  sort_order?: number | null;
  active?: boolean | null;
};

function clean(input: any) {
  return (input ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export default function PlayerClient() {
  const params = useParams() as { roomId?: string } | null;

  const code = useMemo(() => clean(params?.roomId), [params?.roomId]);

  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!code) return;
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`/api/player/videos?code=${encodeURIComponent(code)}&t=${Date.now()}`, {
        cache: "no-store",
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(json?.error || text || `Request failed (${res.status})`);
      }

      setVideos(Array.isArray(json?.videos) ? json.videos : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>IMAOS Player</h1>

        <div style={{ opacity: 0.85, marginTop: 8 }}>
          Code:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900 }}>
            {code || "(missing)"}
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            onClick={load}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #1f4d2a",
              background: "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading…</div> : null}

        {err ? (
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
        ) : null}

        {!loading && !err && videos.length === 0 ? (
          <div style={{ marginTop: 12, opacity: 0.8 }}>No videos assigned (or license inactive).</div>
        ) : null}

        {videos.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              marginTop: 14,
            }}
          >
            {videos.map((v) => (
              <div
                key={v.id}
                style={{
                  border: "1px solid #222",
                  borderRadius: 14,
                  background: "#0f0f0f",
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {v.label}
                  {v.active === false ? <span style={{ marginLeft: 8, opacity: 0.7 }}>(inactive)</span> : null}
                </div>

                <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
                  playback_id:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {v.playback_id}
                  </span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <video
                    controls
                    playsInline
                    style={{ width: "100%", borderRadius: 12, background: "#000" }}
                    src={`https://stream.mux.com/${encodeURIComponent(v.playback_id)}.m3u8`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
