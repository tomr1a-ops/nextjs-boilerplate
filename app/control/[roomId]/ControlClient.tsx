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

function activeGlow(isActive: boolean) {
  return isActive
    ? {
        boxShadow:
          "0 0 0 2px rgba(0,255,140,0.25), 0 0 22px rgba(0,255,140,0.22)",
      }
    : {};
}

export default function ControlClient({ roomId }: { roomId: string }) {
  const rid = clean(roomIdClean) || "studioA";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [remoteState, setRemoteState] = useState<string>("loading");
  const [remotePlaybackId, setRemotePlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // tiny visual feedback for FF/RW
  const [flash, setFlash] = useState<"rw" | "ff" | null>(null);

  async function loadVideos() {
    setErr("");
    try {
      const res = await fetch(`/api/videos?room=${encodeURIComponent(rid)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `videos failed: ${res.status}`);
      setVideos((j?.videos || []) as VideoRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
      setVideos([]);
    }
  }

  async function loadSession() {
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(rid)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `session failed: ${res.status}`);
      const s = (j?.session || {}) as SessionData;
      setRemoteState((s?.state || "stopped") as string);
      setRemotePlaybackId((s?.playback_id || "") as string);
    } catch {
      // don't hard-fail the UI if session endpoint is temporarily down
    }
  }

  useEffect(() => {
    loadVideos();
    loadSession();
    const t = setInterval(loadSession, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return videos;
    return videos.filter((v) => v.label.toLowerCase().includes(s));
  }, [videos, search]);

  async function post(path: string, body: any) {
    setErr("");
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const txt = await res.text();
    let j: any = null;
    try {
      j = txt ? JSON.parse(txt) : null;
    } catch {
      j = { raw: txt };
    }
    if (!res.ok) {
      throw new Error(j?.error || `HTTP ${res.status}`);
    }
    return j;
  }

  async function playLabel(label: string) {
    try {
      await post(`/api/control/play`, { room: rid, video_label: label });
      await loadSession();
    } catch (e: any) {
      setErr(e?.message || "Play failed");
    }
  }

  async function sendAction(action: "pause" | "stop" | "rewind" | "forward") {
    try {
      if (action === "rewind") setFlash("rw");
      if (action === "forward") setFlash("ff");

      await post(`/api/control/${action}`, { room: rid });

      if (action === "rewind" || action === "forward") {
        setTimeout(() => setFlash(null), 200);
      }

      await loadSession();
    } catch (e: any) {
      setErr(e?.message || `${action} failed`);
      setFlash(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 700px at 20% 0%, rgba(255,255,255,0.06), rgba(0,0,0,1) 60%)",
        color: "#fff",
        padding: "46px 28px 80px",
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -0.8 }}>
            IMAOS Control — <span style={{ opacity: 0.85 }}>{rid}</span>
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            State: <span style={{ opacity: 0.9 }}>{remoteState}</span>
          </div>
        </div>

        {/* TOP CONTROLS (NO PLAY BUTTON) */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 26, marginBottom: 18 }}>
          <button
            onClick={() => sendAction("pause")}
            style={{
              padding: "16px 28px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            PAUSE
          </button>

          <button
            onClick={() => sendAction("stop")}
            style={{
              padding: "16px 28px",
              borderRadius: 16,
              border: "1px solid rgba(255,0,0,0.55)",
              background: "rgba(170,0,0,0.9)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            STOP
          </button>

          <button
            onClick={() => sendAction("rewind")}
            style={{
              padding: "16px 28px",
              borderRadius: 16,
              border: flash === "rw" ? "1px solid rgba(0,255,255,0.6)" : "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            RW 10s
          </button>

          <button
            onClick={() => sendAction("forward")}
            style={{
              padding: "16px 28px",
              borderRadius: 16,
              border: flash === "ff" ? "1px solid rgba(0,255,255,0.6)" : "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            FF 10s
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos (ex: AL1, V3)…"
            style={{
              flex: "1 1 320px",
              padding: "16px 18px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 20,
              outline: "none",
            }}
          />
        </div>

        {err ? (
          <div
            style={{
              marginTop: 8,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,60,60,0.35)",
              background: "rgba(120,0,0,0.35)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 800,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {filtered.map((v) => {
            const isActive = !!remotePlaybackId && remotePlaybackId === v.playback_id;
            return (
              <button
                key={v.id}
                onClick={() => playLabel(v.label)}
                style={{
                  padding: "18px 18px",
                  borderRadius: 18,
                  border: isActive ? "1px solid rgba(0,255,140,0.55)" : "1px solid rgba(255,255,255,0.14)",
                  background: isActive ? "rgba(0,255,140,0.14)" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 950,
                  cursor: "pointer",
                  minHeight: 64,
                  ...activeGlow(isActive),
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
          URL format: <code>/control/&lt;roomIdClean&gt;</code>
        </div>
      </div>
    </div>
  );
}
