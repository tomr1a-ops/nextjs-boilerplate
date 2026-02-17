"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type RoomSessionRow = {
  room_id: string;
  playback_id: string | null;
  state: string | null;
  started_at: string | null;
  paused_at: string | null;
  updated_at: string | null;
};

export default function PlayerPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;

  const [row, setRow] = useState<RoomSessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playbackId = row?.playback_id ?? null;

  // 1) initial fetch
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRow(null);
        return;
      }

      setRow((data as RoomSessionRow) ?? null);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // 2) realtime subscribe to this room row
  useEffect(() => {
    setError(null);

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
          // payload.new contains the updated row for UPDATE/INSERT
          // payload.old contains the previous row for UPDATE/DELETE
          if (payload.eventType === "DELETE") {
            setRow(null);
          } else {
            setRow(payload.new as RoomSessionRow);
          }
        }
      )
      .subscribe((status) => {
        // optional: console.log("realtime status", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const muxSrc = useMemo(() => {
    // If you use public playback IDs:
    // https://stream.mux.com/{PLAYBACK_ID}.m3u8
    return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;
  }, [playbackId]);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 36 }}>IMA Studio Player</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>Room: <b>{roomId}</b></p>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: "#2a0000", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div style={{ background: "#0b0f14", borderRadius: 16, padding: 16, minHeight: 420 }}>
          <h2 style={{ marginTop: 0 }}>Player</h2>

          {!muxSrc ? (
            <div style={{ opacity: 0.7, display: "flex", height: 320, alignItems: "center", justifyContent: "center" }}>
              No playback_id set for this room yet.
            </div>
          ) : (
            <video
              key={muxSrc}
              src={muxSrc}
              controls
              autoPlay
              playsInline
              style={{ width: "100%", maxWidth: 900, borderRadius: 12, background: "#000" }}
            />
          )}

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            playback_id: {playbackId ?? "(null)"} • state: {row?.state ?? "(null)"}
          </div>
        </div>
      </div>
    </div>
  );
}
