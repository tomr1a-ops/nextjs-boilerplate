"use client";

import { useMemo, useState } from "react";

type VideoItem = {
  id: string; // Mux PLAYBACK ID (not Asset ID)
  title: string;
};

export default function Home() {
  const videos: VideoItem[] = useMemo(
    () => [
      // IMPORTANT:
      // Put the PLAYBACK ID from Mux here (Playback & Thumbnails section), not the Asset ID.
      { title: "AL1V1", id: "EEtTlvz9FZ0IDpH4iyByDjwV5wI02dhuVOo6EEp12eHMU" },

      // TODO: Replace these with the Playback IDs for each asset
      // { title: "AL1V2", id: "PLAYBACK_ID_HERE" },
      // { title: "AL1V3", id: "PLAYBACK_ID_HERE" },
      // ...
    ],
    []
  );

  const [active, setActive] = useState<VideoItem>(videos[0]);

  const playerSrc = `https://player.mux.com/${active.id}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>IMA Studio Player</div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Now Playing: <b>{active.title}</b>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 18,
          padding: 18,
          flex: 1,
        }}
      >
        {/* Left: Video Menu */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 14,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            Video Library
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {videos.map((v) => {
              const isActive = v.id === active.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setActive(v)}
                  style={{
                    width: "100%",
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: isActive
                      ? "2px solid rgba(255,255,255,0.9)"
                      : "1px solid rgba(255,255,255,0.18)",
                    backgroundColor: isActive ? "#16a34a" : "#111827",
                    color: isActive ? "#000" : "#fff",
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    cursor: "pointer",
                  }}
                >
                  {v.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Player */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            Player
          </div>

          <div
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#000",
              position: "relative",
            }}
          >
            <iframe
              key={playerSrc} // force reload when switching videos
              src={playerSrc}
              style={{
                width: "100%",
                border: "none",
                aspectRatio: "16/9",
                display: "block",
              }}
              allow="autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Using PUBLIC playback IDs (no token required).
          </div>
        </div>
      </div>
    </div>
  );
}
