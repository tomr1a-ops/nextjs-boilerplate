"use client";

import { useEffect, useMemo, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null;
  state?: "playing" | "paused" | "stopped" | string;
  updated_at?: string | null;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export default function PlayerClient({ roomId }: { roomId: string }) {
  const room = useMemo(() => clean(roomId) || "studioA", [roomId]);

  const [state, setState] = useState<string>("loading");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Load mux-player web component once
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
    setErr("");
    const res = await fetch(`/api/session?room=${encodeURIComponent(room)}&t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`session failed: ${res.status} ${txt}`);
    }

    const data = (await res.json()) as SessionData;
    setState(clean(data.state) || "unknown");
    setPlaybackId(clean(data.playback_id));
  }

  // Poll session
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      if (!alive) return;
      try {
        await loadSession();
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load session");
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [room]);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff" }}>
      <div style={{ padding: 14, fontSize: 22, fontWeight: 900 }}>
        IMAOS Player — {room}
        <span style={{ marginLeft: 12, fontSize: 13, opacity: 0.75 }}>
          state: {state || "unknown"}
        </span>
      </div>

      {err ? (
        <div
          style={{
            margin: 14,
            padding: 12,
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

      {!playbackId ? (
        <div style={{ padding: 14, opacity: 0.8 }}>
          Waiting for a video… (no playback_id set for this room)
        </div>
      ) : (
        <div style={{ width: "100%", height: "calc(100vh - 64px)" }}>
          <div
            style={{ width: "100%", height: "100%" }}
            dangerouslySetInnerHTML={{
              __html: `<mux-player
                playback-id="${playbackId}"
                stream-type="on-demand"
                autoplay
                muted
                controls
                style="width:100%;height:100%;"
              ></mux-player>`,
            }}
          />
        </div>
      )}
    </div>
  );
}
