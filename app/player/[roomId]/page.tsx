"use client";

import { useEffect, useState } from "react";
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
  const roomId = params.roomId;

  const [row, setRow] = useState<RoomSessionRow | null>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  // Debug helpers (so we can see EXACTLY what Supabase returns)
  const [debugData, setDebugData] = useState<any>(null);
  const [debugError, setDebugError] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDebugData(null);
      setDebugError(null);

      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId);

      if (cancelled) return;

      setDebugData(data);
      setDebugError(error);

      if (error) {
        setRow(null);
        setPlaybackId(null);
        setState(null);
        return;
      }

      if (data && data.length > 0) {
        const first = data[0] as RoomSessionRow;
        setRow(first);
        setPlaybackId(first.playback_id);
        setState(first.state);
      } else {
        setRow(null);
        setPlaybackId(null);
        setState(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <div style={{ padding: 40, color: "white", background: "black", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 40, marginBottom: 10 }}>IMAOS Player</h1>

      <div style={{ fontSize: 22, marginBottom: 10 }}>
        <strong>Room:</strong> {roomId}
      </div>

      <div style={{ fontSize: 22, marginBottom: 10 }}>
        <strong>State:</strong> {state ?? "(empty / not found)"}
      </div>

      <div style={{ fontSize: 22, marginBottom: 20 }}>
        <strong>Playback ID:</strong> {playbackId ?? "(none)"}
      </div>

      <div style={{ fontSize: 22, marginTop: 40 }}>
        {playbackId ? (
          <div>
            <div style={{ marginBottom: 10 }}>✅ Video selected (Mux next)</div>
            <div style={{ opacity: 0.85 }}>
              (Once we wire Mux playback, this is where the player renders.)
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 28, marginTop: 40 }}>No video selected.</div>
        )}
      </div>

      <hr style={{ margin: "40px 0", opacity: 0.3 }} />

      <h2 style={{ fontSize: 22, marginBottom: 10 }}>Debug (what Supabase returned)</h2>

      <div style={{ marginBottom: 14 }}>
        <strong>Supabase error:</strong>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(debugError, null, 2)}
        </pre>
      </div>

      <div>
        <strong>Supabase data:</strong>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </div>

      <hr style={{ margin: "40px 0", opacity: 0.3 }} />

      <h2 style={{ fontSize: 22, marginBottom: 10 }}>Debug (params)</h2>
      <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
        {JSON.stringify({ roomId }, null, 2)}
      </pre>
    </div>
  );
}
