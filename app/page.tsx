"use client";

import { useMemo, useState } from "react";

type VideoItem = {
  id: string; // Mux PLAYBACK ID (not Asset ID)
  title: string;
};

function cleanId(id: string) {
  return (id || "").trim();
}

// Playback IDs are long base62-ish strings; this catches placeholders/short/empty/obvious bad values.
function looksLikeMuxPlaybackId(id: string) {
  const v = cleanId(id);
  return /^[A-Za-z0-9]{40,80}$/.test(v);
}

export default function Home() {
  const videos: VideoItem[] = useMemo(
    () => [
      { title: "AL1V1", id: "EEtT1vz9FZ01DpH4iyByDjwV5w102dhuVOo6EEp12eHMU" },
      { title: "AL1V2", id: "e7X7EJp8Jahpq6flU02DnQwLFHO4TddylPRBu7K5Gbfc" },
      { title: "AL1V3", id: "XuLHibjnFLc8qk9Igm9Hy9zdjWuxQkmWUYtnIj17mCE" },
      { title: "AL1V4", id: "4qL5JKtULtosN2ZBIk6LeWOiTltq3MPN502EKyX5mxJk" },
      { title: "AL1V5", id: "Cnk501oW00IqBMr4mAvMTbuVVCBBuSnPBZjZPcyvfnOKc" },
      { title: "AL2V1", id: "K8gSatGtFiAFoHOX1y00UCBoJ7QAf62yLv47ssZ3EX00I" },
      { title: "AL2V2", id: "1AdrfOytgHRI8Wz01YSe01FPLM4l7lPsz00frWqqFk4TP8" },
      { title: "AL2V3", id: "FetjqAx46HX2N11C2MAxKs2n0116bzvJgWl62FceIJoE" },
      { title: "AL2V4", id: "yxgsEPSAz60000OPuQUOB7RzQE277ckkVMq14cbfHU2sU" },
      { title: "AL2V5", id: "vyYgEDdFFyugHokVXjoKxBvb2Sz7mxRVf66R6LtrXEA" },
      { title: "AL3V1", id: "bDKMIv2brILRM019XxKPJoubPCcznJUIE19YxQUUsPmI" },
      { title: "AL3V2", id: "bCUqBVSqt1gAVV02BgYUStXSC2V1Omce4cxUB8ijV8J8" },
      { title: "AL3V3", id: "qH3sUQwV01g00fZrmCPE01wz00RjQ1UGJhnwmj8ARhQ3j7o" },
      { title: "AL3V4", id: "ePFMYIR5bse5uoNszdbXtOKywa89pKtfv01jcq1PJwAk" },
      { title: "AL3V5", id: "zorscGp9dOlOHdMpPoVf001hW6ByEVKJeTL00GIVPWFkQ" },
    ],
    []
  );

  // Pick the first valid video as default
  const firstValid = videos.find((v) => looksLikeMuxPlaybackId(v.id)) ?? videos[0];
  const [active, setActive] = useState<VideoItem>(firstValid);

  const playbackId = cleanId(active.id);
  const playerSrc = looksLikeMuxPlaybackId(playbackId)
    ? `https://player.mux.com/${playbackId}`
    : "";

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
              const id = cleanId(v.id);
              const isActive = cleanId(active.id) === id && id.length > 0;
              const disabled = !looksLikeMuxPlaybackId(id);

              return (
                <button
                  key={v.title}
                  onClick={() => !disabled && setActive({ ...v, id })}
                  disabled={disabled}
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
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.4 : 1,
                  }}
                  title={disabled ? "Missing/invalid Playback ID" : id}
                >
                  {v.title} {disabled ? " (missing ID)" : ""}
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

          {!playerSrc ? (
            <div style={{ padding: 16, opacity: 0.85 }}>
              This button doesn’t have a valid Mux **Playback ID** yet.
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                Current value: <code>{JSON.stringify(active.id)}</code>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#000",
              }}
            >
              <iframe
                key={playerSrc}
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
          )}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Using PUBLIC playback IDs (no token required).
          </div>
        </div>
      </div>
    </div>
  );
}
