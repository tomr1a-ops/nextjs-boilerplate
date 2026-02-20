"use client";

import { useEffect, useMemo, useState } from "react";

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
  updated_at?: string | null;
  seek_seconds?: number | null;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function getRoomFromPath(): string {
  try {
    if (typeof window === "undefined") return "";
    const parts = window.location.pathname.split("/").filter(Boolean);
    // /control/<roomId>
    return parts[0] === "control" ? (parts[1] || "") : (parts[parts.length - 1] || "");
  } catch {
    return "";
  }
}

export default function ControlClient({ roomId: roomIdProp }: { roomId?: string }) {
  const roomId = clean(roomIdProp) || clean(getRoomFromPath()) || "studioA";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [flash, setFlash] = useState<"rw" | "ff" | null>(null);
  const [clicked, setClicked] = useState<"play" | "pause" | "stop" | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("");

  function activeGlow(on: boolean) {
    return on
      ? {
          boxShadow: "0 0 0 3px rgba(0,255,140,0.35), 0 0 18px rgba(0,255,140,0.18)",
        }
      : {};
  }

  async function loadVideos() {
    setErr("");
    try {
      const res = await fetch(`/api/videos?room=${encodeURIComponent(roomId)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error ? String(j.error) : `videos failed: ${res.status}`);
        setVideos([]);
        return;
      }
      const j = await res.json();
      setVideos(Array.isArray(j?.videos) ? j.videos : []);
    } catch (e: any) {
      setErr(e?.message || "videos failed");
      setVideos([]);
    }
  }

  async function refreshSession() {
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as SessionData;
      setRemoteState(clean(data.state) || "unknown");
      setRemotePlaybackId(clean(data.playback_id));
    } catch {}
  }

  useEffect(() => {
    loadVideos();
    refreshSession();
    const id = window.setInterval(() => {
      refreshSession();
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const filtered = useMemo(() => {
    const q = clean(search).toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.label.toLowerCase().includes(q));
  }, [videos, search]);

  async function postState(state: "playing" | "paused" | "stopped", playback_id?: string | null) {
    setErr("");
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, playback_id: playback_id ?? null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error ? JSON.stringify(j) : `command failed: ${res.status}`);
        return;
      }
      await refreshSession();
    } catch (e: any) {
      setErr(e?.message || "command failed");
    }
  }

  async function seekDelta(delta: number) {
    setErr("");
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "seek_delta", value: delta }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error ? JSON.stringify(j) : `seek failed: ${res.status}`);
        return;
      }
    } catch (e: any) {
      setErr(e?.message || "seek failed");
    }
  }

  const isPlaying = remoteState === "playing";
  const isPaused = remoteState === "paused";
  const isStopped = remoteState === "stopped";

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 28 }}>
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 44, margin: 0, letterSpacing: 0.5 }}>
            IMAOS Control — <span style={{ opacity: 0.85 }}>{roomId}</span>
          </h1>

          <div
            style={{
              padding: "10px 16px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              fontWeight: 900,
            }}
          >
            State: <span style={{ opacity: 0.9 }}>{remoteState}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 22, alignItems: "center" }}>
          <button
            onClick={() => {
              setClicked("play");
              setTimeout(() => setClicked(null), 220);
              postState("playing", remotePlaybackId || null);
            }}
            style={{
              padding: "18px 34px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#1d7f22",
              color: "#000",
              fontSize: 22,
              fontWeight: 950,
              cursor: "pointer",
              ...(clicked === "play" || isPlaying ? activeGlow(true) : {}),
            }}
          >
            PLAY
          </button>

          <button
            onClick={() => {
              setClicked("pause");
              setTimeout(() => setClicked(null), 220);
              postState("paused", remotePlaybackId || null);
            }}
            style={{
              padding: "18px 34px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              fontSize: 22,
              fontWeight: 950,
              cursor: "pointer",
              ...(clicked === "pause" || isPaused ? activeGlow(true) : {}),
            }}
          >
            PAUSE
          </button>

          <button
            onClick={() => {
              setClicked("stop");
              setTimeout(() => setClicked(null), 220);
              postState("stopped", null);
            }}
            style={{
              padding: "18px 34px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#6a1d1d",
              color: "#fff",
              fontSize: 22,
              fontWeight: 950,
              cursor: "pointer",
              ...(clicked === "stop" || isStopped ? activeGlow(true) : {}),
            }}
          >
            STOP
          </button>

          <button
            onClick={() => {
              setFlash("rw");
              setTimeout(() => setFlash(null), 180);
              seekDelta(-10);
            }}
            style={{
              padding: "18px 28px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              fontSize: 20,
              fontWeight: 900,
              cursor: "pointer",
              ...(flash === "rw" ? activeGlow(true) : {}),
            }}
          >
            RW 10s
          </button>

          <button
            onClick={() => {
              setFlash("ff");
              setTimeout(() => setFlash(null), 180);
              seekDelta(10);
            }}
            style={{
              padding: "18px 28px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              fontSize: 20,
              fontWeight: 900,
              cursor: "pointer",
              ...(flash === "ff" ? activeGlow(true) : {}),
            }}
          >
            FF 10s
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos (ex: AL1, V3)..."
            style={{
              flex: 1,
              padding: "18px 18px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: 20,
              outline: "none",
            }}
          />
        </div>

        {err ? (
          <div
            style={{
              marginTop: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,70,70,0.45)",
              background: "rgba(255,0,0,0.14)",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 18 }}>
          {filtered.map((v) => {
            const isActive = activeLabel === v.label;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setActiveLabel(v.label);
                  postState("playing", v.label); // server normalizes label -> playback_id
                }}
                style={{
                  padding: "18px 16px",
                  borderRadius: 18,
                  border: isActive ? "1px solid rgba(0,255,140,0.55)" : "1px solid rgba(255,255,255,0.14)",
                  background: isActive ? "rgba(0,255,140,0.14)" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 950,
                  cursor: "pointer",
                  minHeight: 64,
                  ...activeGlow(Boolean(isActive)),
                }}
                title={v.playback_id}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Tip: open this on your phone/tablet and bookmark it. <br />
          URL format: <code>/control/&lt;roomId&gt;</code>
        </div>
      </div>
    </div>
  );
}
