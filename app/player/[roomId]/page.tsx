"use client";

import { useParams } from "next/navigation";

export default function PlayerPage() {
  const params = useParams() as Record<string, string | string[] | undefined>;

  // Handle different key casing + array form + decode
  const raw =
    params?.roomId ??
    params?.roomid ??
    params?.roomID ??
    "";

  const roomId = Array.isArray(raw) ? raw[0] : raw;
  const safeRoomId = decodeURIComponent(roomId || "");

  return (
    <div style={{ padding: 40, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>IMAOS Player</h1>

      <div style={{ fontSize: 22, marginBottom: 20 }}>
        <strong>Room ID:</strong> {safeRoomId || "(BLANK — params not coming through)"}
      </div>

      <div style={{ fontSize: 16, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
        <strong>Debug params:</strong>
        <pre style={{ marginTop: 10 }}>{JSON.stringify(params, null, 2)}</pre>
      </div>
    </div>
  );
}
