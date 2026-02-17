"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

type RoomSession = {
  room_id: string;
  playback_id: string | null;
  state: string | null;
};

export default function PlayerPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  // Load current room state on mount
  useEffect(() => {
    if (!roomId) return;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (!error && data) {
        setPlaybackId(data.playback_id);
        setState(data.state);
      }
    }

    loadInitial();
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel("room-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newData = payload.new as RoomSession;
          setPlaybackId(newData.playback_id);
          setState(newData.state);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff" }}>
      <div style={{ padding: 20 }}>
        <h1>IMA Studio Player</h1>
        <p>Room: {roomId}</p>
        <p>State: {state}</p>
      </div>

      <div style={{ padding: 20 }}>
        {playbackId ? (
          <video
            key={playbackId}
            src={`https://stream.mux.com/${playbackId}.m3u8`}
            autoPlay
            controls
            style={{ width: "100%", maxWidth: 1000 }}
          />
        ) : (
          <p>No video selected.</p>
        )}
      </div>
    </div>
  );
}
