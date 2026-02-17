"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [session, setSession] = useState<RoomSession | null>(null);

  // Load Mux Player web component (no npm install needed)
  useEffect(() => {
    const existing = document.querySelector('script[data-mux-player="1"]');
    if (existing) return;

    const s = document.createElement("script");
    s.src = "https://unpkg.com/@mux/mux-player";
    s.async = true;
    s.setAttribute("data-mux-player", "1");
    document.head.appendChild(s);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .limit(1);

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      setSession(data?.[0] ?? null);
    };

    fetchRoom();
  }, [roomId]);

  // Realtime subscribe
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setSession(payload.new as RoomSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const playbackId = session?.playback_id ?? null;
  const state = session?.state ?? "idle";

  // Remount the mux-player element when playback changes
  const playerKey = useMemo(() => playbackId || "no-video", [playbackId]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      {playbackId ? (
        // @ts-ignore — mux-player is a custom element
        <mux-player
          key={playerKey}
          playback-id={playbackId}
          stream-type="on-demand"
          autoplay={state === "playing"}
          muted
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <div
          style={{
            color: "white",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          Waiting for video…
        </div>
      )}
    </div>
  );
}
