"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoItem = { id: string; title: string };

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // may be label OR mux id; server will store mux id after your map
  state?: "playing" | "paused" | "stopped" | string;
  started_at?: string | null;
  paused_at?: string | null;
  updated_at?: string | null;
};

function clean(s: string) {
  return (s || "").trim();
}

export default function Home() {
  // Read URL params
  const [roomId, setRoomId] = useState("studioA");
  const [mode, setMode] = useState<"player" | "controller">("controller");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const room = clean(sp.get("room") || "studioA");
    const m = clean(sp.get("mode") || "controller");
    setRoomId(room || "studioA");
    setMode(m === "player" ? "player" : "controller");
  }, []);

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

  const [activeMuxId, setActiveMuxId] = useState<string>("");
  const [remoteState, setRemoteState] = useState<string>("unknown");
  const lastAppliedRef = useRef<string>("");

  async function postSession(update: Partial<SessionData>) {
    const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`POST failed (${res.status}) ${t}`);
    }
  }

  // Poll the room state
  useEffect(() => {
    if (!roomId) return;

    let alive = true;

    async function tick() {
      try {
        const res = await fetch(`/api/session?room=${encodeURIComponent(roomId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as SessionData;
        if (!alive) return;

        const state = clean(String(data.state || ""));
        setRemoteState(state || "unknown");

        if (state === "stopped") {
          if (lastAppliedRef.current !== "STOPPED") {
            lastAppliedRef.current = "STOPPED";
            setActiveMuxId("");
          }
          return;
        }

        const muxId = clean(String(data.playback_id || ""));
        if (!muxId) return;

        if (lastAppliedRef.current !== muxId) {
          lastAppliedRef.current = muxId;
          setActiveMuxId(muxId);
        }
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 1000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  const playerSrc = activeMuxId ? `https://player.mux.com/${activeMuxId}` : "";

  async function handlePick(label: string) {
    await postSession({
      state: "playing",
      playback_id: label, // you send AL1V1; server stores mux id
      started_at: new Date().toISOString(),
      paused_at: null,
    });
  }

  async function handleStop() {
    await postSession({
      state: "stopped",
      playback_id: null,
      started_at: null,
      paused_at: null,
    });
  }

  // PLAYER MODE (Fire TV): fullscreen, no menu
  if (mode === "player") {
    return (
      <div style={{ minHeight: "100vh", background: "#000" }}>
        {!playerSrc ? null : (
          <iframe
            key={playerSrc}
            src={playerSrc}
            style={{
              width: "100vw",
              height: "100vh",
              border: "none",
              display: "block",
              background: "#000",
            }}
            allow="autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        )}

        {/* tiny overlay for debugging (optional) */}
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            padding: "6px 10px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          room: <b>{roomId}</b> • state: <b>{remoteState}</b>
        </div>
      </div>
    );
  }

  // CONTROLLER MODE (Phone/iPad)
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>IMAOS Room Controller</div>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          room: <b>{roomId}</b> • state: <b>{remoteState}</b>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {videos.map((v) => (
          <button
            key={v.title}
            onClick={() => handlePick(v.title)}
            style={{
              padding: "14px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#16a34a",
              color: "#000",
              fontWeight: 900,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {v.title}
          </button>
        ))}
      </div>

      <button
        onClick={handleStop}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "14px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "#374151",
          color: "#fff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        STOP
      </button>
    </div>
  );
}
