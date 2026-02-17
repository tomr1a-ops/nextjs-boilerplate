// app/player/[roomId]/page.tsx
"use client";

export default function PlayerPage({ params }: { params: { roomId: string } }) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>IMA Studio Player</h1>

      <div style={{ opacity: 0.8, marginBottom: 24 }}>
        Room: <b>{params.roomId}</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        {/* Left: library */}
        <div style={{ background: "#0b0f16", borderRadius: 14, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Video Library</h2>

          {["AL1V1", "AL1V2", "AL1V3", "AL1V4", "AL1V5"].map((v) => (
            <button
              key={v}
              style={{
                width: "100%",
                padding: "16px 14px",
                margin: "8px 0",
                borderRadius: 12,
                border: "1px solid #1e293b",
                background: v === "AL1V2" ? "#16a34a" : "#0f172a",
                color: v === "AL1V2" ? "#000" : "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => {
                // placeholder click
                alert(`Clicked ${v} for room ${params.roomId}`);
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Right: player */}
        <div style={{ background: "#05070b", borderRadius: 14, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Player</h2>

          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#111",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontWeight: 700,
            }}
          >
            Video will render here (Mux next)
          </div>
        </div>
      </div>
    </div>
  );
}
