"use client";

import { useEffect, useMemo, useState } from "react";

type VideoRow = { label: string; [key: string]: any };

function clean(input: string) {
  return (input || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export default function ControlClient({ roomId }: { roomId: string }) {
  const rid = useMemo(() => clean(roomId), [roomId]);

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      if (!rid || rid === "(missing)") {
        setErr(`Missing roomId param. Raw prop = "${String(roomId)}"`);
        setVideos([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/videos?room=${encodeURIComponent(rid)}&t=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
        setVideos(Array.isArray(json?.videos) ? json.videos : []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load allowed videos");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid, roomId]);

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>IMAOS Control</div>
        <h1 style={{ margin: 0, fontSize: 26 }}>Room: {rid || "(missing)"}</h1>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
          Raw prop: <span style={{ fontFamily: "monospace" }}>{String(roomId)}</span>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f1c0c0",
            background: "#fff5f5",
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>Error</strong>
          <div>{err}</div>
        </div>
      ) : null}

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        Allowed videos for this room
      </div>

      {loading ? (
        <div style={{ padding: 12, opacity: 0.8 }}>Loading…</div>
      ) : videos.length === 0 ? (
        <div style={{ padding: 12, border: "1px dashed #bbb", borderRadius: 12 }}>
          No allowed videos found for <strong>{rid || "(missing)"}</strong>.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {videos.map((v) => (
            <div
              key={v.label}
              style={{
                padding: "14px 10px",
                borderRadius: 14,
                border: "1px solid #1f1f1f",
                background: "#39d353",
                color: "#000",
                fontWeight: 800,
                textAlign: "center",
              }}
            >
              {v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
