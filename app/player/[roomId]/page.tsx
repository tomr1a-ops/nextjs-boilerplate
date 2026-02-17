"use client";

export default function PlayerPage({
  params,
}: {
  params: { roomId: string };
}) {
  return (
    <div style={{ padding: 40 }}>
      <h1>PLAYER v2</h1>
      <p>Room ID: {params.roomId}</p>
    </div>
  );
}
