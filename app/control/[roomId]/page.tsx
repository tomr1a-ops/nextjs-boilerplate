"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoRow = {
  id: string;
  label: string;
  playback_id: string;
  sort_order: number | null;
  active: boolean;
};

type SessionData = {
  room_id?: string;
  playback_id?: string | null;
  state?: "playing" | "paused" | "stopped" | string;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export default function ControlRoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const roomId = clean(params.roomId) || "studioA";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Highlight states
  const [flash, setFlash] = useState<string | null>(null); // "rw","ff","play","pause","stop","video-{id}"

  // Hold logic
  const holdTimerRef = useRef<number | null>(null);
  const holdingRef = useRef<"rw" | "ff" | null>(null);

  const TAP_SECONDS = 10;
  const HOLD_INTERVAL_MS = 200;

  async function loadVideos() {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/videos${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`videos failed: ${res.status}`);
    const data = await res.json();
    setVideos((data?.videos ?? []) as VideoRow[]);
  }

  async function loadSession() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;
    setRemoteState(clean(data.state) || "unknown");
    setRemotePlaybackId(clean(data.playback_id));
  }

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      try {
        await loadSession();
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  useEffect(() => {
    const t = window.setTimeout(loadVideos, 200);
    return () => window.clearTimeout(t);
  }, [search]);

  const nowLabel = useMemo(() => {
    if (!remotePlaybackId) return "";
    const v = videos.find((x) => x.playback_id === remotePlaybackId);
    return v?.label || "";
  }, [remotePlaybackId, videos]);

  async function setSession(payload: any) {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      setErr(text);
      return;
    }

    await loadSession();
  }

  function flashButton(name: string) {
    setFlash(name);
    setTimeout(() => setFlash(null), 200);
  }

  async function playVideo(v: VideoRow) {
    flashButton(`video-${v.id}`);
    await setSession({
      state: "playing",
      playback_id: v.playback_id,
    });
  }

  async function pause() {
    flashButton("pause");
    await setSession({
      state: "paused",
      playback_id: remotePlaybackId || null,
    });
  }

  async function resume() {
    flashButton("play");
    await setSession({
      state: "playing",
      playback_id: remotePlaybackId || null,
    });
  }

  async function stop() {
    flashButton("stop");
    stopHold();
    await setSession({
      state: "stopped",
      playback_id: null,
    });
  }

  async function seekDelta(delta: number) {
    await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        command: "seek_delta",
        value: delta,
      }),
    });
  }

  function stopHold() {
    if (holdTimerRef.current !== null) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdingRef.current = null;
  }

  function startHold(type: "rw" | "ff") {
    if (holdTimerRef.current) return;

    flashButton(type);
    holdingRef.current = type;

    const delta = type === "rw" ? -TAP_SECONDS : TAP_SECONDS;

    seekDelta(delta);

    holdTimerRef.current = window.setInterval(() => {
      if (!holdingRef.current) return;
      seekDelta(delta);
    }, HOLD_INTERVAL_MS);
  }

  function handlePointerDown(e: React.PointerEvent, type: "rw" | "ff") {
    e.preventDefault();
    startHold(type);
  }

  function handlePointerUp() {
    stopHold();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#0b0b0b",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          IMAOS Control — {roomId}
        </h1>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={resume}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: flash === "play" ? "#00ff88" : "#1f7a1f",
              color: "#000",
              fontWeight: 900,
            }}
          >
            PLAY
          </button>

          <button
            onClick={pause}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: flash === "pause" ? "#888" : "#333",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            PAUSE
          </button>

          <button
            onClick={stop}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: flash === "stop" ? "#ff4444" : "#5a1d1d",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            STOP
          </button>

          <button
            onClick={() => flashButton("rw")}
            onPointerDown={(e) => handlePointerDown(e, "rw")}
            onPointerUp={handlePointerUp}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: flash === "rw" ? "#0077ff" : "#222",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            RW {TAP_SECONDS}s
          </button>

          <button
            onClick={() => flashButton("ff")}
            onPointerDown={(e) => handlePointerDown(e, "ff")}
            onPointerUp={handlePointerUp}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: flash === "ff" ? "#00c853" : "#222",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            FF {TAP_SECONDS}s
          </button>
        </div>

        {/* Video grid */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {videos.map((v) => {
            const isActive =
              remotePlaybackId && v.playback_id === remotePlaybackId;
            const isFlashing = flash === `video-${v.id}`;

            return (
              <button
                key={v.id}
                onClick={() => playVideo(v)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 16,
                  border: isActive
                    ? "2px solid rgba(0,255,140,0.8)"
                    : "1px solid rgba(255,255,255,0.15)",
                  background: isFlashing
                    ? "rgba(255,255,255,0.2)"
                    : isActive
                    ? "rgba(0,255,140,0.12)"
                    : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
