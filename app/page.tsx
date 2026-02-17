"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type VideoRow = {
  label: string;
  playback_id: string;
  sort_order: number;
  active: boolean;
};

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // NOTE: in your DB this is the REAL mux playback id after normalization
  state?: "playing" | "paused" | "stopped" | string;
  started_at?: string | null;
  paused_at?: string | null;
  updated_at?: string | null;
};

export const dynamic = "force-dynamic";

function clean(v: any) {
  return (v ?? "").toString().trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // sb_publishable_...
);

export default function Home() {
  // For now, keep your test room fixed.
  // Later we’ll make this dynamic (/controller/[roomId]).
  const roomId = "studioA";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [sessionPlaybackId, setSessionPlaybackId] = useState<string>(""); // real mux id
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // avoid re-applying same state endlessly
  const lastSeen = useRef<string>("");

  // Load the 15 videos from Supabase (and any future ones you add)
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
        setErr(`Videos load failed: ${error.message}`);
        return;
      }

      setVideos((data || []) as VideoRow[]);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function postSession(update: Partial<SessionData>) {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`POST /api/session failed (${res.status}) ${txt}`);
    }

    const data = (await res.json().catch(() => null)) as SessionData | null;
    return data;
  }

  async function refresh() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;

    const data = (await res.json()) as SessionData;

    const state = clean(data.state) || "unknown";
    const pb = clean(data.playback_id); // real mux id in room_sessions after your normalization

    setRemoteState(state);
    setSessionPlaybackId(pb);

    const stamp = `${state}:${pb}`;
    lastSeen.current = stamp;
  }

  // poll every 1s (we can upgrade to realtime later)
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        if (!alive) return;
        await refresh();
      } catch {
        // ignore transient errors
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  async function handlePick(label: string) {
    setErr("");
    setBusy(true);
    try {
      // IMPORTANT: send the LABEL, not mux id.
      // Your /api/session route converts label -> mux id using Supabase videos table.
      await postSession({
        state: "playing",
        playback_id: label,
        started_at: new Date().toISOString(),
        paused_at: null,
      });

      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setErr("");
    setBusy(true);
    try {
      await postSession({
        state: "stopped",
        playback_id: null,
        started_at: null,
        paused_at: null,
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  // Determine which label is currently playing by matching the session mux id to videos table
  const currentLabel =
    sessionPlaybackId &&
    videos.find((v) => clean(v.playback_id) === clean(sessionPlaybackId))?.label;

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
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800 }}>IMAOS Room Controller</div>

        <div style={{ fontSize: 14, opacity: 0.85 }}>
          room: <b>{roomId}</b> • state: <b>{remoteState}</b>
          {currentLabel ? (
            <>
              {" "}
              • now: <b>{currentLabel}</b>
            </>
          ) : null}
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

      {/* Buttons grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          flex: 1,
        }}
      >
        {videos.map((v) => {
          const isActive = currentLabel === v.label && remoteState === "playing";
          return (
            <button
              key={v.label}
              onClick={() => handlePick(v.label)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "18px 12px",
                borderRadius: 14,
                border: isActive
                  ? "2px solid rgba(255,255,255,0.9)"
                  : "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "#16a34a",
                color: "#000",
                fontWeight: 900,
                letterSpacing: 0.6,
                fontSize: 16,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {v.label}
            </button>
          );
        })}

        {!videos.length ? (
          <div style={{ gridColumn: "1 / -1", opacity: 0.8, fontSize: 13 }}>
            Loading videos… (If this never loads, check NEXT_PUBLIC_SUPABASE_ANON_KEY and
            RLS policy on public.videos)
          </div>
        ) : null}
      </div>

      {/* Stop */}
      <button
        onClick={handleStop}
        disabled={busy}
        style={{
          width: "100%",
          padding: "18px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.18)",
          backgroundColor: "#374151",
          color: "#fff",
          fontWeight: 900,
          letterSpacing: 1,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        STOP
      </button>
    </div>
  );
}
