"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useParams } from "next/navigation";

export default function PlayerPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId);

      console.log("ROOM ID:", roomId);
      console.log("DATA:", data);
      console.log("ERROR:", error);

      setData(data?.[0] || null);
    };

    fetchRoom();
  }, [roomId]);

  return (
    <div style={{ background: "black", color: "white", padding: 40 }}>
      <h1>IMAOS Player</h1>

      <p>Room: {roomId}</p>
      <p>State: {data?.state || "(empty / not found)"}</p>
      <p>Playback ID: {data?.playback_id || "(none)"}</p>
    </div>
  );
}
