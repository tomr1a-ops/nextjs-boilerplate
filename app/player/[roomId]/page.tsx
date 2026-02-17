"use client";

// app/player/[roomId]/page.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase-browser";

type RoomSessionRow = {
  room_id: string;
  playback_id: string | null;
  state: string | null;
  started_at: string | null;
  paused_at: string | null;
  updated_at: string | null;
};

function muxHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export default function PlayerPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;

  const [session, setSession] = useState<RoomSessionRow | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Changes whenever the playback changes, forces <video> to reload cleanly
  const videoKey = useMemo(() => session?.playback_id ?? "none", [session?.playback_id]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setStatus("loading");

      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Initial fetch error:", error);
        setStatus("error");
        setSession(null);
        return;
      }

      setSession((data as RoomSessionRow) ?? null);
      setStatus("ready");
    }

    load();

    const channel = supabase
      .channel(`room_sessions:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // payload.new is the updated row
          const next = payload.new as RoomSessionRow;
          setSession(next);
          setStatus("ready");
        }
      )
      .subscribe((s) => {
        // s can be "SUBSCRIBED", etc.
        // console.log("Realtime status:", s);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    // When playback_id changes, attempt autoplay
    const v = videoRef.current;
    if (!v) return;

    const tryPlay = async () => {
      try {
        // Most kiosk browsers allow autoplay if muted.
        // You can unmute with remote later if needed.
        v.muted = true;
        await v.play();
      } catch (e) {
        // Autoplay blocked: user gesture may be required on some devices
        console.warn("Autoplay blocked:", e);
      }
    };

    if (session?.playback_id && session.state === "playing") {
      tryPlay();
    }
  }, [session?.playback_id, session?.state]);

  const isPlaying = session?.state === "playing" && !!session?.playback_id;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "black",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal top bar (can remove later) */}
      <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
        Player • room: <b>{roomId}</b> • state: <b>{session?.state ?? status}</b>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!isPlaying ? (
          <div style={{ textAlign: "center", maxWidth: 720, padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>Waiting for coach…</div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>
              This TV is connected to room <b>{roomId}</b>.
              <br />
              When you press a video on the controller, it will start here automatically.
            </div>
            <div style={{ fontSize: 12, marginTop: 14, opacity: 0.6 }}>
              Debug: playback_id={session?.playback_id ?? "null"}
            </div>
          </div>
        ) : (
          <video
            key={videoKey}
            ref={videoRef}
            src={muxHlsUrl(session!.playback_id!)}
            playsInline
            autoPlay
            controls={false}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "black",
            }}
          />
        )}
      </div>
    </div>
  );
}
