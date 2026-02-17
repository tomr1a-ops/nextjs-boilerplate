"use client";

import { useEffect, useMemo, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { createClient } from "@supabase/supabase-js";

type VideoRow = {
  label: string;
  playback_id: string;
  sort_order: number;
  active: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // This MUST be the publishable/anon key (browser-safe)
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LibraryPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [selected, setSelected] = useState<VideoRow | null>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // optional: pick which room you want to control from this page
  const roomId = "studioA";

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");
      const { data, error } = await supabase
        .from("videos")
        .select("label, playback_id, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        return;
      }

      const rows = (data || []) as VideoRow[];
      setVideos(rows);
      setSelected(rows[0] ?? null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function setRoomToSelected() {
    if (!selected) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: "playing",
          playback_id: selected.label, // label is fine; API converts to mux id via Supabase
          started_at: new Date().toISOString(),
          paused_at: null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to set room (${res.status}) ${txt}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>IMAOS Video Library</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Showing <b>{videos.length}</b> videos
        </div>
      </div>

      {err ? (
        <div
          style={{
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left: video list */}
        <div style={{ overflow: "auto", paddingRight: 6 }}>
          {videos.map((v) => {
            const active = selected?.label === v.label;
            return (
              <button
                key={v.label}
                onClick={() => setSelected(v)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "18px 12px",
                  borderRadius: 14,
                  marginBottom: 10,
                  border: active
                    ? "2px solid rgba(255,255,255,0.9)"
                    : "1px solid rgba(255,255,255,0.15)",
                  backgroundColor: "#16a34a",
                  color: "#000",
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  fontSize: 16,
                  cursor: "pointer",
                  opacity: active ? 0.95 : 1,
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Right: player */}
        <div style={{ minHeight: 0 }}>
          {selected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  Selected: <span style={{ color: "#86efac" }}>{selected.label}</span>
                </div>

                <button
                  onClick={setRoomToSelected}
                  disabled={busy}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#374151",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                  title={`Send ${selected.label} to room ${roomId}`}
                >
                  SET {roomId} TO THIS VIDEO
                </button>
              </div>

              <MuxPlayer
                playbackId={selected.playback_id}
                streamType="on-demand"
                controls
                style={{ width: "100%", height: "calc(100vh - 190px)" }}
              />

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                Direct HLS URL:{" "}
                <span style={{ fontFamily: "monospace" }}>
                  https://stream.mux.com/{selected.playback_id}.m3u8
                </span>
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.8 }}>Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

