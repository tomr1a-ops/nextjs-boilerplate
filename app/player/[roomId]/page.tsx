export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { headers } from "next/headers";

type PlayerVideo = {
  id: string;
  label: string;
  playback_id: string;
};

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function PlayerPage({
  params,
}: {
  params: { roomId: string };
}) {
  const code = (params.roomId || "").trim().toUpperCase();

  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/player/videos?code=${encodeURIComponent(code)}`,
    { cache: "no-store" }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return (
      <div style={{ padding: 40, background: "#000", color: "#fff" }}>
        <h1>IMAOS Player</h1>
        <div style={{ marginTop: 20, color: "#f87171", fontWeight: 700 }}>
          {json?.error || "License inactive or invalid."}
        </div>
      </div>
    );
  }

  const videos: PlayerVideo[] = Array.isArray(json?.videos)
    ? json.videos
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 20 }}>
      <h1 style={{ fontWeight: 900 }}>IMAOS Player — {code}</h1>

      {videos.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          No videos assigned.
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
          {videos.map((v) => (
            <div key={v.id}>
              <div style={{ fontWeight: 900 }}>{v.label}</div>
              <video
                controls
                playsInline
                style={{ width: "100%", marginTop: 10 }}
                src={`https://stream.mux.com/${v.playback_id}.m3u8`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
