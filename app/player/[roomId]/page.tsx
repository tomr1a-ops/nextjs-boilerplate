// app/player/[roomId]/page.tsx
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

export default function PlayerPage({
  params,
}: {
  params: { roomId: string };
}) {
  const roomId = decodeURIComponent(params.roomId);

  const [row, setRow] = useState<RoomSessionRow | null>(null);
  const [status, setStatus] = useState<string>("loading...");
  const [error, setError] = useState<string | null>(null);

  const channelName = useMemo(() => `room_sessions:${roomId}`, [roomId]);

  async function loadOnce() {
    setStatus("loading...");
    setError(null);

    const { data, error } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }

    if (!data) {
      setRow(null);
      setStatus(`no room_sessions row for room_id='${roomId}'`);
      return;
    }

    setRow(data as RoomSessionRow);
    setStatus("ready");
  }

  useEffect(() => {
    loadOnce();

    const channel = supabase
      .channel(channelName)
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
          setRow(next);
          setStatus("updated (realtime)");
        }
      )
      .subscribe((s) => {
        // optional: show realtime status
        // console.log("realtime:", s);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, channelName]);

  const playbackId = row?.playback_id ?? "";
  const state = row?.state ?? "unknown";

  return (
    <div
      style={{
        height: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: 24,
        boxSizing: "border-box",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>IMAOS Player</div>
        <div style={{ opacity: 0.8 }}>
          room: <b>{roomId}</b> • state: <b>{state}</b>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 14 }}>
        {status}
        {error ? ` • ERROR: ${error}` : ""}
      </div>

      <div
        style={{
          marginTop: 18,
          flex: 1,
          border: "2px solid rgba(255,255,255,0.15)",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
      >
        {playbackId ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 10 }}>
              playback_id
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 0.5,
                wordBreak: "break-all",
                maxWidth: 900,
              }}
            >
              {playbackId}
            </div>

            <div style={{ marginTop: 14, fontSize: 14, opacity: 0.75 }}>
              Next step: we’ll render the actual Mux player using this playback_id.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", opacity: 0.85 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Waiting…</div>
            <div style={{ marginTop: 8 }}>
              No <code>playback_id</code> set for room <b>{roomId}</b>.
            </div>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.75 }}>
              Update <code>public.room_sessions.playback_id</code> and this screen should change instantly.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
        TV URL format: <code>/player/&lt;roomId&gt;</code> (example:{" "}
        <code>/player/studioA</code>)
      </div>
    </div>
  );
}
