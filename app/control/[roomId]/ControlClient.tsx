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

export default function ControlClient({ roomId }: { roomId: string }) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // visual feedback for FF/RW
  const [flash, setFlash] = useState<"rw" | "ff" | null>(null);

  // visual feedback for play/pause/stop
  const [clicked, setClicked] = useState<"play" | "pause" | "stop" | null>(null);

  async function loadVideos() {
    setErr("");
    const res = await fetch(`/api/videos?room=${encodeURIComponent(roomId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setErr(`videos failed: ${res.status}`);
      return;
    }
    const data = await res.json();
    setVideos((data?.videos || []) as VideoRow[]);
  }

  async function refreshSession() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;
    setRemoteState(clean(data.state) || "unknown");
    setRemotePlaybackId(clean(data.playback_id));
  }

  useEffect(() => {
    loadVideos().catch(() => {});
    refreshSession().catch(() => {});
    const id = window.setInterval(() => refreshSession().catch(() => {}), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return videos;
    return videos.filter((v) => v.label.toLowerCase().includes(s));
  }, [videos, search]);

  async function postState(state: "playing" | "paused" | "stopped", playback?: string) {
    setErr("");
    setClicked(state === "playing" ? "play" : state === "paused" ? "pause" : "stop");
    window.setTimeout(() => setClicked(null), 250);

    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        playback_id: playback ?? remotePlaybackId ?? null,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      setErr(t || `state failed: ${res.status}`);
      return;
    }

    refreshSession().catch(() => {});
  }

  async function seekDelta(delta: number) {
    setErr("");
    setFlash(delta < 0 ? "rw" : "ff");
    window.setTimeout(() => setFlash(null), 220);

    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "seek_delta", value: delta }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      setErr(t || `seek failed: ${res.status}`);
      return;
    }
  }

  async function playVideo(label: string) {
    // This POST goes to /api/session which normalizes label->playback_id (your normalizePlaybackId)
    await postState("playing", label);
  }

  const btnBase: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    borderRadius: 18,
    padding: "16px 22px",
    fontSize: 22,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  };

  function activeGlow(on: boolean) {
    return on
      ? {
          outline: "3px solid rgba(0,255,140,0.65)",
          boxShadow: "0 0 0 6px rgba(0,255,140,0.15), 0 12px 30px rgba(0,0,0,0.35)",
        }
      : {};
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        padding: 28,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: -0.5 }}>
            IMAOS Control — <span style={{ opacity: 0.85 }}>{roomId}</span>
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontWeight: 800,
            }}
          >
            State: <span style={{ fontWeight: 950 }}>{remoteState}</span>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button
            style={{
              ...btnBase,
              background: "rgba(0,180,60,0.65)",
              color: "#000",
              minWidth: 170,
              ...activeGlow(clicked === "play"),
            }}
            onClick={() => postState("playing")}
          >
            PLAY
          </button>

          <button
            style={{
              ...btnBase,
              minWidth: 170,
              background: "rgba(120,120,120,0.35)",
              ...activeGlow(clicked === "pause"),
            }}
            onClick={() => postState("paused")}
          >
            PAUSE
          </button>

          <button
            style={{
              ...btnBase,
              minWidth: 170,
              background: "rgba(180,40,40,0.6)",
              ...activeGlow(clicked === "stop"),
            }}
            onClick={() => postState("stopped")}
          >
            STOP
          </button>

          <button
            style={{
              ...btnBase,
              minWidth: 170,
              background: flash === "rw" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
              ...activeGlow(flash === "rw"),
            }}
            onClick={() => seekDelta(-10)}
          >
            RW 10s
          </button>

          <button
            style={{
              ...btnBase,
              minWidth: 170,
              background: flash === "ff" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
              ...activeGlow(flash === "ff"),
            }}
            onClick={() => seekDelta(+10)}
          >
            FF 10s
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos (ex: AL1, V3)..."
            style={{
              ...btnBase,
              minWidth: 360,
              padding: "16px 18px",
              fontWeight: 700,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16,
              outline: "none",
            }}
          />
        </div>

        {err ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "rgba(200,0,0,0.18)",
              border: "1px solid rgba(200,0,0,0.35)",
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ height: 18 }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 14 }}>
          {filtered.map((v) => {
            const isActive = remotePlaybackId && remotePlaybackId === v.playback_id;
            return (
              <button
                key={v.id}
                onClick={() => playVideo(v.label)}
                style={{
                  ...btnBase,
                  borderRadius: 22,
                  padding: "18px 14px",
                  fontSize: 24,
                  background: isActive ? "rgba(0,255,140,0.14)" : "rgba(255,255,255,0.06)",
                  border: isActive ? "1px solid rgba(0,255,140,0.55)" : "1px solid rgba(255,255,255,0.14)",
                  ...activeGlow(isActive),
                  minHeight: 64,
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
