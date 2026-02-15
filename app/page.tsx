"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoItem = {
  id: string; // Mux PLAYBACK ID (not Asset ID)
  title: string; // Label like AL1V1
};

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // we expect this to be "AL1V1" etc (label)
  state?: "playing" | "paused" | "stopped" | string;
  started_at?: string | null;
  paused_at?: string | null;
  updated_at?: string | null;
};

function cleanId(id: string) {
  return (id || "").trim();
}

// Mux Playback IDs are long base62-ish strings; this catches placeholders/short/empty/obvious bad values.
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
  const [remoteState, setRemoteState] = useState<string>("local");
  const [lastRemoteLabel, setLastRemoteLabel] = useState<string>("");

  // used to avoid re-applying the same remote value over and over
  const lastAppliedRef = useRef<string>("");

  // ---- helper: map session.playback_id to a VideoItem
  function resolveFromSessionPlaybackId(pb: string | null | undefined): VideoItem | null {
    const raw = (pb || "").trim();
    if (!raw) return null;

    // If Supabase stores the LABEL (AL1V1, etc)
    const byTitle = videos.find((v) => v.title === raw);
    if (byTitle) return byTitle;

    // If it ever stores the actual Mux playback id
    if (looksLikeMuxPlaybackId(raw)) {
      const byId = videos.find((v) => cleanId(v.id) === raw);
      if (byId) return byId;
    }

    return null;
  }

  // ---- POST helper
  async function postSession(update: Partial<SessionData>) {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`POST /api/session failed (${res.status}) ${txt}`);
    }
  }

  // ---- Poll /api/session every 1s and sync the player
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as SessionData;

        if (!alive) return;

        const state = (data.state || "").toString();
        setRemoteState(state || "unknown");

        const label = (data.playback_id || "").toString().trim(); // "AL1V1" etc
        if (label) setLastRemoteLabel(label);

        // handle STOP: blank the player by setting active to an empty id (still shows menu)
        if (state === "stopped") {
          if (lastAppliedRef.current !== "STOPPED") {
            lastAppliedRef.current = "STOPPED";
            // keep the title display but blank the src
            setActive((prev) => ({ ...prev, id: "" }));
          }
          return;
        }

        const resolved = resolveFromSessionPlaybackId(data.playback_id);
        if (!resolved) return;

        // only switch if changed
        if (lastAppliedRef.current !== resolved.title) {
          lastAppliedRef.current = resolved.title;
          setActive(resolved);
        }
      } catch {
        // ignore polling errors (network hiccups, deploys, etc)
      }
    }

    // immediate tick + interval
    tick();
    const id = window.setInterval(tick, 1000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [videos]);

  // Build player URL
  const playbackId = cleanId(active.id);

  // If active.id is blank (stopped), show no player
  const playerSrc =
    looksLikeMuxPlaybackId(playbackId) ? `https://player.mux.com/${playbackId}` : "";

  // Click a button: set local + POST to Supabase
  async function handlePick(v: VideoItem) {
    const id = cleanId(v.id);
    if (!looksLikeMuxPlaybackId(id)) return;

    // update local immediately (fast UI)
    setActive({ ...v, id });

    // update remote session (Supabase stores the LABEL in playback_id)
    await postSession({
      state: "playing",
      playback_id: v.title, // this matches what you tested manually
      started_at: new Date().toISOString(),
      paused_at: null,
    });
  }

  async function handleStop() {
    // local
    setActive((prev) => ({ ...prev, id: "" }));

    // remote
    await postSession({
      state: "stopped",
      playback_id: null,
      started_at: null,
      paused_at: null,
    });
  }

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

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Remote: <b>{remoteState || "unknown"}</b>
            {lastRemoteLabel ? (
              <>
                {" "}
                • Session: <b>{lastRemoteLabel}</b>
              </>
            ) : null}
          </div>

          <button
            onClick={handleStop}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              backgroundColor: "#374151",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
            title="Stop (clears session)"
          >
            STOP
          </button>
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
              const isActive = v.title === active.title && looksLikeMuxPlaybackId(playbackId);
              const disabled = !looksLikeMuxPlaybackId(id);

              return (
                <button
                  key={v.title}
                  onClick={() => !disabled && handlePick(v)}
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
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Player</div>

          {!playerSrc ? (
            <div style={{ padding: 16, opacity: 0.85 }}>
              Player is stopped (or no valid Mux Playback ID selected).
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                Current title: <code>{JSON.stringify(active.title)}</code>
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
            Polling <code>/api/session</code> every 1s. DB stores{" "}
            <code>playback_id</code> as the label (AL1V1…).
          </div>
        </div>
      </div>
    </div>
  );
}
