"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type VideoRow = {
  label: string;
  playback_id: string;
  sort_order: number;
  active: boolean;
};

function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function LibraryPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [selected, setSelected] = useState<VideoRow | null>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // keep one supabase instance for the browser session (created lazily)
  const supabaseRef = useRef<any>(null);

  const roomId = "studioA";

  // Load mux-player web component once
  useEffect(() => {
    const id = "mux-player-script";
    if (document.getElementById(id)) return;

    const s = document.createElement("script");
    s.id = id;
    s.src = "https://unpkg.com/@mux/mux-player";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Init supabase + load videos list
  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");

      if (!supabaseRef.current) {
        supabaseRef.current = getBrowserSupabase();
      }
      const supabase = supabaseRef.current;

      if (!supabase) {
        setErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
        return;
      }

      const { data, error } = await (supabase as any)
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
          playback_id: selected.label, // label is fine; API converts via Supabase
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
        {/* Left list */}
        <div style={{ overflow: "auto", paddingRight: 6 }}>
          {videos.map((v) => {
            const active = selected?.label === v.label;
            return (
              <button
                key={v.label}
                onClick={() => setSelected(v)}
                style={{
                  width: "100%",
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

        {/* Right player */}
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
                >
                  SET {roomId} TO THIS VIDEO
                </button>
              </div>

              {/* Avoid TS/JSX typing issues by injecting the web component markup */}
              <div
                style={{ width: "100%", height: "calc(100vh - 190px)" }}
                dangerouslySetInnerHTML={{
                  __html: `<mux-player
                    playback-id="${selected.playback_id}"
                    stream-type="on-demand"
                    controls
                    style="width:100%;height:100%;"
                  ></mux-player>`,
                }}
              />
            </>
          ) : (
            <div style={{ opacity: 0.8 }}>No video selected</div>
          )}
        </div>
      </div>
    </div>
  );
}
