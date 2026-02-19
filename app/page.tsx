"use client";

import { useEffect, useRef, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null;
  state?: "playing" | "paused" | "stopped" | string;
  seek_seconds?: number | null;
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

  const lastSeekRef = useRef<number>(0);

  const [remoteState, setRemoteState] = useState<string>("loading");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [seekCounter, setSeekCounter] = useState<number>(0);

  const [err, setErr] = useState<string>("");
  const [needsTap, setNeedsTap] = useState<boolean>(false);
  const [hlsStatus, setHlsStatus] = useState<string>("init");

  async function refresh() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;

    setRemoteState(clean(data.state) || "unknown");
    setPlaybackId(clean(data.playback_id));
    setSeekCounter(typeof data.seek_seconds === "number" ? data.seek_seconds : 0);
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

  // apply seek delta when seekCounter changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prev = lastSeekRef.current || 0;
    const next = Number.isFinite(seekCounter) ? seekCounter : 0;
    const delta = next - prev;

    // store immediately so repeated renders don't reapply
    lastSeekRef.current = next;

    if (!delta) return;

    const doSeek = () => {
      try {
        const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        const target = Math.max(0, current + delta);
        video.currentTime = target;
      } catch {}
    };

    // If metadata not ready, wait a beat
    if (video.readyState >= 1) {
      doSeek();
    } else {
      const onMeta = () => {
        doSeek();
        video.removeEventListener("loadedmetadata", onMeta);
      };
      video.addEventListener("loadedmetadata", onMeta);
      // fallback
      setTimeout(() => {
        try {
          doSeek();
        } catch {}
      }, 500);
    }
  }, [seekCounter]);

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
      setHlsStatus("stopped");
      return;
    }

    const url = muxHlsUrl(playbackId);

    try {
      setHlsStatus("loading hls.js");
      await loadHlsJs();

      // @ts-ignore
      const Hls = (window as any).Hls;
      if (!Hls || !Hls.isSupported()) {
        setHlsStatus("Hls not supported");
        setErr("hls.js not supported in this WebView (no MSE).");
        return;
      }

      destroyHls();

      setHlsStatus("attaching");
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
            setHlsStatus("recover network");
            try {
              hls.startLoad();
            } catch {}
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            setHlsStatus("recover media");
            try {
              hls.recoverMediaError();
            } catch {}
          } else {
            setHlsStatus("fatal");
          }
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      video.muted = true;
      video.playsInline = true;

      setHlsStatus("ready");

      if (remoteState === "paused") {
        video.pause();
        return;
      }

      if (forcePlay || remoteState === "playing") {
        const p = video.play();
        if (p && typeof (p as any).catch === "function") {
          (p as any).catch(() => {
            setNeedsTap(true);
            setHlsStatus("needs tap");
          });
        }
      }
    } catch (e: any) {
      setErr(e?.message || "Playback error");
      setHlsStatus("error");
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
      }}
      onClick={() => {
        if (needsTap) attachAndPlay(true);
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        controls={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000",
        }}
      />

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

      {/* (Optional) keep or remove debug overlay later */}
      <div
        style={{
          position: "fixed",
          left: 10,
          bottom: 10,
          color: "rgba(255,255,255,0.85)",
          fontSize: 12,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "rgba(0,0,0,0.25)",
          padding: "6px 10px",
          borderRadius: 10,
          maxWidth: "92vw",
          lineHeight: 1.35,
        }}
      >
        room <b>{roomId}</b> • state <b>{remoteState}</b> • hls <b>{hlsStatus}</b> • seek{" "}
        <b>{seekCounter}</b>
        {playbackId ? (
          <>
            {" "}
            • id <span style={{ fontFamily: "monospace" }}>{playbackId.slice(0, 10)}…</span>
          </>
        ) : (
          <> • no video set</>
        )}
        {err ? (
          <div style={{ marginTop: 6, color: "rgba(255,170,170,0.95)" }}>
            <b>{err}</b>
          </div>
        ) : null}
      </div>
    </div>
  );
}
