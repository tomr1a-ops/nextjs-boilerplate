"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// IMPORTANT: use RELATIVE import so we don't depend on @ alias config
import { supabase } from "../../../lib/supabase-browser";

type RoomSessionRow = {
  room_id: string;
  playback_id: string | null;
  state: string;
  started_at: string | null;
  paused_at: string | null;
  updated_at: string | null;
};

export default function PlayerPage() {
  const params = useParams();
  const roomId = (params?.roomId as string) || "";

  const [row, setRow] = useState<RoomSessionRow | null>(null);
  const [status, setStatus] = useState<string>("loading...");

  useEffect(() => {
    if (!roomId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function boot() {
      setStatus("loading...");

      // 1) Fetch current state from room_sessions
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (error) {
        setRow(null);
        setStatus(`❌ room_sessions row not found for room_id='${roomId}'`);
      } else {
        setRow(data as RoomSessionRow);
        setStatus("✅ connected");
      }

      // 2) Subscribe to realtime updates for this room
      channel = supabase
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
            if (payload.new) setRow(payload.new as RoomSessionRow);
          }
        )
        .subscribe();
    }

    boot();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <div style={{ padding: 40, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>IMAOS Player</h1>

      <div style={{ fontSize: 22, marginBottom: 20 }}>
        <strong>Room ID:</strong> {roomId || "(missing)"}
      </div>

      <div style={{ fontSize: 18, marginBottom: 20 }}>
        <strong>Status:</strong> {status}
      </div>

      <div
        style={{
          padding: 18,
          border: "1px solid #ddd",
          borderRadius: 12,
          maxWidth: 800,
          background: "#fafafa",
          whiteSpace: "pre-wrap",
        }}
      >
        <strong>Live room_sessions row:</strong>
        {"\n\n"}
        {row ? JSON.stringify(row, null, 2) : "(no data)"}
      </div>
    </div>
  );
}
