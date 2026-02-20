"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null;
  state?: "playing" | "paused" | "stopped" | string;
  updated_at?: string | null;
  started_at?: string | null;
  paused_at?: string | null;
  seek_seconds?: number | null;
  command_id?: number | null;
  command_type?: string | null;
  command_value?: number | null;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export default function PlayerRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = clean(params?.roomId) || "studioA";

  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const muxElRef = useRef<any>(null);

  // Load mux-player web component once (client-side)
  useEffect(() => {
    const id = "mux-player-script";
    if (document.getElementById(id)) return;

    const s = document.createElement("script");
    s.id = id;
    s.src = "https://unpkg.com/@mux/mux-player";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function loadSession() {
    const url = `/api/session?room=${encodeURIComponent(roomId)}&t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      // don't hard-fail: just show status
      setRemoteState(`error:${res.status}`);
      return;
    }
    const data = (await res.json()) as SessionData;
    setRemoteState(clean(data.state) || "unknown");
    setRemotePlaybackId(clean(data.playback_id));
  }

  // Poll session
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      if (!alive) return;
      try {
        await loadSession();
      } catch {
        // ignore transient fetch issues
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  const statusText = useMemo(() => {
    const st = remoteState || "unknown";
    const pb = remotePlaybackId ? remotePlaybackId.slice(0, 10) + "…" : "none";
    return `state=${st} • playback=${pb}`;
  }, [remoteState, remotePlaybackId]);

  // Ensure mux-player element exists once
  useEffect(() => {
    if (!playerHostRef.current) return;
    if (muxElRef.current) return;

    // Create <mux-player> element dynamically (avoids TS/JSX typing headaches)
    const el = document.createElement("mux-player") as any;
    el.setAttribute("stream-type", "on-demand");
    el.setAttribute("controls", "true");
    el.setAttribute("autoplay", "true");
    el.setAttribute("muted", "true"); // avoids autoplay blocks in browsers
    el.setAttribute("playsinline", "true");
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.background = "black";

    playerHostRef.current.innerHTML = "";
    playerHostRef.current.appendChild(el);
    muxElRef.current = el;
  }, []);

  // Drive player from session state
  useEffect(() => {
    const el = muxElRef.current;
    if (!el) return;

    setErr("");

    const state = clean(remoteState);
    const playbackId = clean(remotePlaybackId);

    // STOP: clear playback
    if (state === "stopped" || !playbackId) {
      try {
        el.removeAttribute("playback-id");
      } catch {}
      try {
        el.pause?.();
      } catch {}
      return;
    }

    // If playback_id changed, set it
    try {
      const current = el.getAttribute("playback-id") || "";
      if (current !== playbackId) {
        el.setAttribute("playback-id", playbackId);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to set playback-id");
      return;
    }

    // PLAY/PAUSE
    if (state === "paused") {
      try {
        el.pause?.();
      } catch {}
    } else if (state === "playing") {
      try {
        el.play?.();
      } catch {}
    }
  }, [remoteState, remotePlaybackId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.65)",
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
          IMAOS Player — <span style={{ opacity: 0.85 }}>{roomId}</span>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 13, opacity: 0.85 }}>
          {statusText}
        </div>
      </div>

      {/* Error strip */}
      {err ? (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(255,0,0,0.12)",
            borderBottom: "1px solid rgba(255,0,0,0.2)",
            color: "rgba(255,220,220,0.95)",
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : null}

      {/* Player area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div
          ref={playerHostRef}
          style={{
            width: "100%",
            height: "100%",
            background: "#000",
          }}
        />
      </div>
    </div>
  );
}
