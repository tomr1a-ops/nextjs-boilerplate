"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // should be the REAL mux playback id in room_sessions
  state?: "playing" | "paused" | "stopped" | string;
  started_at?: string | null;
  paused_at?: string | null;
  updated_at?: string | null;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function muxHlsUrl(playbackId: string) {
  // Mux HLS manifest
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export default function PlayerRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = clean(params.roomId) || "studioA";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  const [remoteState, setRemoteState] = useState<string>("loading");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Load hls.js once (CDN) for WebView/Android where native HLS is spotty
  useEffect(() => {
    const id = "hlsjs-script";
    if (document.getElementById(id)) return;

    const s = document.createElement("script");
    s.id = id;
    s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function refresh() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;

    const state = clean(data.state) || "unknown";
    const pb = clean(data.playback_id);

    setRemoteState(state);
    setPlaybackId(pb);
  }

  // Poll session every 1s (we can upgrade to realtime later)
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        if (!alive) return;
        await refresh();
      } catch {}
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  // Attach playback to <video> whenever playbackId changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setErr("");

    // Cleanup old hls instance if any
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}

    // If stopped or no id, clear video
    if (!playbackId || remoteState === "stopped") {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    const url = muxHlsUrl(playbackId);

    // @ts-ignore
    const Hls = (window as any).Hls;

    // If browser supports native HLS (Safari sometimes), use it
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl");

    const startPlayback = async () => {
      try {
        if (Hls && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
        } else if (canNativeHls) {
          video.src = url;
        } else {
          // Worst-case fallback: still try setting src (some WebViews play it anyway)
          video.src = url;
        }

        // Autoplay reliably on TV: mute is key
        video.muted = true;
        video.playsInline = true;

        // Play or pause based on state
        if (remoteState === "paused") {
          video.pause();
        } else {
          await video.play().catch(() => {});
        }
      } catch (e: any) {
        setErr(e?.message || "Playback error");
      }
    };

    startPlayback();
  }, [playbackId, remoteState]);

  // React to pause/play updates
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (remoteState === "paused") v.pause();
    if (remoteState === "playing") v.play().catch(() => {});
  }, [remoteState]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Fullscreen video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain", // portrait video on portrait TV looks correct
          background: "#000",
        }}
      />

      {/* Tiny debug overlay (safe on TV) */}
      <div
        style={{
          position: "fixed",
          left: 10,
          bottom: 10,
          color: "rgba(255,255,255,0.8)",
          fontSize: 12,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "rgba(0,0,0,0.35)",
          padding: "6px 10px",
          borderRadius: 10,
        }}
      >
        room <b>{roomId}</b> • state <b>{remoteState}</b>
        {playbackId ? (
          <>
            {" "}
            • id <span style={{ fontFamily: "monospace" }}>{playbackId.slice(0, 6)}…</span>
          </>
        ) : (
          <> • no video set</>
        )}
        {err ? <> • error: {err}</> : null}
      </div>
    </div>
  );
}
