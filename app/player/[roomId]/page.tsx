"use client";

import { useEffect, useRef, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // real mux playback id
  state?: "playing" | "paused" | "stopped" | string;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function muxHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function loadHlsJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = "hlsjs-script";
    if (document.getElementById(id)) return resolve();

    const s = document.createElement("script");
    s.id = id;
    s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load hls.js"));
    document.head.appendChild(s);
  });
}

export default function PlayerRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = clean(params.roomId) || "studioA";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  const [remoteState, setRemoteState] = useState<string>("loading");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [needsTap, setNeedsTap] = useState<boolean>(false);

  async function refresh() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;

    setRemoteState(clean(data.state) || "unknown");
    setPlaybackId(clean(data.playback_id));
  }

  // poll room session
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

  // destroy helper
  function destroyHls() {
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } catch {}
  }

  // attach HLS to video (FORCE hls.js)
  async function attachAndPlay(forcePlay: boolean) {
    const video = videoRef.current;
    if (!video) return;

    setErr("");
    setNeedsTap(false);

    if (!playbackId || remoteState === "stopped") {
      destroyHls();
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    const url = muxHlsUrl(playbackId);

    try {
      await loadHlsJs();

      // @ts-ignore
      const Hls = (window as any).Hls;
      if (!Hls || !Hls.isSupported()) {
        setErr("hls.js not supported in this WebView (no MSE).");
        return;
      }

      destroyHls();

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
        const msg = `HLS error: ${data?.type || "?"} ${data?.details || "?"} fatal=${data?.fatal}`;
        setErr(msg);

        if (data?.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            try {
              hls.startLoad();
            } catch {}
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try {
              hls.recoverMediaError();
            } catch {}
          }
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      // Autoplay on TV: must be muted
      video.muted = true;
      video.playsInline = true;

      if (remoteState === "paused") {
        video.pause();
        return;
      }

      if (forcePlay || remoteState === "playing") {
        const p = video.play();
        if (p && typeof (p as any).catch === "function") {
          (p as any).catch(() => {
            setNeedsTap(true);
          });
        }
      }
    } catch (e: any) {
      setErr(e?.message || "Playback error");
    }
  }

  // re-attach whenever id/state changes
  useEffect(() => {
    attachAndPlay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackId, remoteState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => destroyHls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        position: "relative",
        padding: 0,
        margin: 0,
      }}
      onClick={() => {
        // Optional: try fullscreen on first OK/click (works in some Fire TV browsers)
        const el = document.documentElement as any;
        if (!document.fullscreenElement && el?.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        }

        // User gesture fallback for autoplay blocks
        if (needsTap) attachAndPlay(true);
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        controls={false}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          background: "#000",
        }}
      />

      {/* Tap overlay if autoplay blocked */}
      {needsTap ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 26,
            fontWeight: 900,
            background: "rgba(0,0,0,0.35)",
          }}
        >
          Press OK to Start
        </div>
      ) : null}

      {/* Optional: keep errors only (no room/state debug) */}
      {err ? (
        <div
          style={{
            position: "fixed",
            left: 10,
            bottom: 10,
            color: "rgba(255,170,170,0.95)",
            fontSize: 12,
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            background: "rgba(0,0,0,0.35)",
            padding: "6px 10px",
            borderRadius: 10,
            maxWidth: "92vw",
            lineHeight: 1.35,
          }}
        >
          <b>{err}</b>
        </div>
      ) : null}
    </div>
  );
}
