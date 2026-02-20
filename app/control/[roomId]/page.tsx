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

export default function ControlRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = clean(params.roomId) || "studioA";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [flash, setFlash] = useState<"rw" | "ff" | null>(null);

  async function loadVideos() {
    setErr("");
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    qs.set("room", roomId); // ✅ NEW: filter by licensee access
    const res = await fetch(`/api/videos?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`videos failed: ${res.status}`);
    const data = await res.json();
    setVideos((data?.videos ?? []) as VideoRow[]);
  }

  async function loadSession() {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, { cache: "no-store" });
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
    let alive = true;
    const t = window.setTimeout(async () => {
      if (!alive) return;
      try {
        await loadVideos();
      } catch (e: any) {
        setErr(e?.message || "Failed to load videos");
      }
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [search, roomId]);

  const nowLabel = useMemo(() => {
    if (!remotePlaybackId) return "";
    const v = videos.find((x) => x.playback_id === remotePlaybackId);
    return v?.label || "";
  }, [remotePlaybackId, videos]);

  async function setSession(payload: any) {
    setErr("");
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(text);
        throw new Error(j?.error || `session failed ${res.status}`);
      } catch {
        throw new Error(text || `session failed ${res.status}`);
      }
    }

    try {
      await loadSession();
    } catch {}
  }

  async function playVideo(v: VideoRow) {
    await setSession({
      state: "playing",
      playback_id: v.playback_id,
      started_at: new Date().toISOString(),
      paused_at: null,
    });
  }

  async function pause() {
    await setSession({
      state: "paused",
      playback_id: remotePlaybackId || null,
      paused_at: new Date().toISOString(),
    });
  }

  async function resume() {
    await setSession({
      state: "playing",
      playback_id: remotePlaybackId || null,
      started_at: new Date().toISOString(),
      paused_at: null,
    });
  }

  async function stop() {
    await setSession({
      state: "stopped",
      playback_id: null,
      paused_at: null,
      seek_seconds: null,
    });
  }

  async function seekDelta(deltaSeconds: number) {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        command: "seek_delta",
        value: deltaSeconds,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(text);
        throw new Error(j?.error || `seek failed ${res.status}`);
      } catch {
        throw new Error(text || `seek failed ${res.status}`);
      }
    }
  }

  async function handleSeek(delta: number, type: "rw" | "ff") {
    setErr("");
    setFlash(type);
    try {
      await seekDelta(delta);
    } catch (e: any) {
      setErr(e?.message || "Seek failed");
    } finally {
      window.setTimeout(() => setFlash(null), 250);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#0b0b0b",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }}>
            IMAOS Control — <span style={{ opacity: 0.85 }}>{roomId}</span>
          </h1>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              State: <b style={{ opacity: 1 }}>{remoteState}</b>
              {nowLabel ? (
                <>
                  {" "}
                  • Now: <b>{nowLabel}</b>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button
            onClick={resume}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#1f7a1f",
              color: "#000",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            PLAY
          </button>

          <button
            onClick={pause}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#333",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            PAUSE
          </button>

          <button
            onClick={stop}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#5a1d1d",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            STOP
          </button>

          <button
            onClick={() => handleSeek(-10, "rw")}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: flash === "rw" ? "#0077ff" : "#222",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 120,
              transition: "background 0.15s ease",
            }}
          >
            RW 10s
          </button>

          <button
            onClick={() => handleSeek(10, "ff")}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: flash === "ff" ? "#00c853" : "#222",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 120,
              transition: "background 0.15s ease",
            }}
          >
            FF 10s
          </button>

          <div style={{ marginLeft: "auto", flex: "1 1 280px" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos (ex: AL1, V3)…"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                outline: "none",
                fontSize: 15,
              }}
            />
          </div>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.18)",
              color: "rgba(255,220,220,0.95)",
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {videos.map((v) => {
            const isActive = remotePlaybackId && v.playback_id === remotePlaybackId;
            return (
              <button
                key={v.id}
                onClick={() => playVideo(v)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 16,
                  border: isActive
                    ? "2px solid rgba(0,255,140,0.75)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: isActive ? "rgba(0,255,140,0.12)" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 950,
                  letterSpacing: 0.3,
                  cursor: "pointer",
                  minHeight: 58,
                }}
                title={v.playback_id}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
          Tip: open this on your phone/tablet and bookmark it.
          <br />
          URL format: <span style={{ fontFamily: "monospace" }}>/control/studioA</span>
        </div>
      </div>
    </div>
  );
}
