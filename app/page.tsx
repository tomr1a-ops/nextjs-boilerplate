"use client";

import { useEffect, useMemo, useState } from "react";

type VideoItem = {
  id: string; // Mux Playback ID
  title: string;
};

export default function Home() {
  // ✅ Put ALL your videos here (Playback IDs from Mux)
  const videos: VideoItem[] = useMemo(
    () => [
      // LEVEL 1
      { title: "AL1V1", id: "XlyabeYunw7Or01obP01QSM4pPPqwGPhASIu8Lulk1U1A" },
      { title: "AL1V2", id: "UuGE7dMyciCb4vbtn3so06V6Z7lJ600RsHrQ58C01Eb3o" },
      { title: "AL1V3", id: "IZVvR002seW6tsZkFAs2z2iu00A5j8UJ02t4cpggrrL3TQ" },
      { title: "AL1V4", id: "PYM6YfVI4tXPAmP5JQgmhNj6ZEs5nBRivUlLCDYayYo" },
      { title: "AL1V5", id: "aB902FvqZX33uvBV8MG7hT4cNRYzm5xLjpHERI0083ZNE" },

      // LEVEL 2
      { title: "AL2V1", id: "tnfMtND397VBYgVKijP8S5LK2P01bCOnVhdT6o7vI6yg" },
      { title: "AL2V2", id: "oFW1lBUiUFd02zqg4pfQxQe01jBzgan6xMVttTSeaIc7M" },
      { title: "AL2V3", id: "TETzpPDFZA8EPkprxQVw5VLDsckFmgecPcSbwQeyXGQ" },
      { title: "AL2V4", id: "pFeakCTI1j6PyitCF013Ny7rwjKztduZ9En02u2dTn0PQ" },
      { title: "AL2V5", id: "ePjgmvyxk45hx02qZpZ0101EpnkmK5oXW7dnGD00k3Dd9c4" },

      // LEVEL 3
      { title: "AL3V1", id: "8k29rESyBBzz8s0ikjnaQ6JDCRJ5LLFBDsKGciRjhJE" },
      { title: "AL3V2", id: "hD4YRxvkzJUeepPIMR7e011yy6UpCe11LgAiC9NmTXs4" },
      { title: "AL3V3", id: "XNj1l02mFA01S9HfzS00bJ200aKhtHx89s79xjl3lG3ut00" },
      { title: "AL3V4", id: "CWYp6R00rbQtVWNuXZ00cG01ycN00M7BxPke478G7SmwjDc" },
      { title: "AL3V5", id: "HsfKVz006F4GyumDdVgU1N4BHu0001DKJ5UpVVGdT1FFQ" },
    ],
    []
  );

  const [active, setActive] = useState<VideoItem>(videos[0]);

  // ✅ signed playback token for the active video
  const [token, setToken] = useState<string>("");
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadToken() {
      setLoadingToken(true);
      setToken("");
      setTokenError("");

      try {
        const res = await fetch(
          `/api/mux-token?playbackId=${encodeURIComponent(active.id)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Token API failed (${res.status}): ${text}`);
        }

        const data = await res.json();

        if (!data?.token) throw new Error("Token API returned no token");

        if (!cancelled) setToken(data.token);
      } catch (e: any) {
        if (!cancelled) setTokenError(e?.message || "Failed to fetch token");
      } finally {
        if (!cancelled) setLoadingToken(false);
      }
    }

    loadToken();

    return () => {
      cancelled = true;
    };
  }, [active.id]);

  // ✅ IMPORTANT: signed playback token must be appended to player URL
  const playerSrc = token
    ? `https://player.mux.com/${active.id}?token=${encodeURIComponent(token)}`
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

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
            Tip: Add more videos by copying the object format in the code.
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
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.75)",
              fontSize: 14,
              textAlign: "center",
              padding: 12,
            }}
          >
            {loadingToken && <div>Loading secure token…</div>}

            {!loadingToken && tokenError && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Token Error
                </div>
                <div style={{ opacity: 0.85 }}>{tokenError}</div>
              </div>
            )}

            {!loadingToken && !tokenError && token && (
              <iframe
                key={`${active.id}:${token}`} // force reload when token changes
                src={playerSrc}
                style={{
                  width: "100%",
                  border: "none",
                  aspectRatio: "16/9",
                  display: "block",
                }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Controls (pause/seek) are in the player UI for now. Next step is
            adding big on-screen control buttons if you want.
          </div>
        </div>
      </div>
    </div>
  );
}
