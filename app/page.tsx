"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SessionData = {
  room_id?: string;
  playback_id?: string | null; // label like "AL1V1"
  state?: "playing" | "paused" | "stopped" | string;
  started_at?: string | null;
  paused_at?: string | null;
  updated_at?: string | null;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export default function Home() {
  const roomId = "studioA";

  const videos = useMemo(
    () => [
      "AL1V1",
      "AL1V2",
      "AL1V3",
      "AL1V4",
      "AL1V5",
      "AL2V1",
      "AL2V2",
      "AL2V3",
      "AL2V4",
      "AL2V5",
      "AL3V1",
      "AL3V2",
      "AL3V3",
      "AL3V4",
      "AL3V5",
    ],
    []
  );

  const [remoteState, setRemoteState] = useState<string>("loading");
  const [sessionLabel, setSessionLabel] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // avoid re-applying same state endlessly
  const lastSeen = useRef<string>("");

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

    const data = (await res.json().catch(() => null)) as SessionData | null;
    return data;
  }

  async function refresh() {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as SessionData;

    const state = clean(data.state) || "unknown";
    const label = clean(data.playback_id);

    setRemoteState(state);
    setSessionLabel(label);

    const stamp = `${state}:${label}`;
    lastSeen.current = stamp;
  }

  // poll every 1s
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        if (!alive) return;
        await refresh();
      } catch {
        // ignore transient errors
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  async function handlePick(label: string) {
    setErr("");
    setBusy(true);
    try {
      await postSession({
        state: "playing",
        playback_id: label, // <-- THIS IS THE ONLY THING WE NEED
        started_at: new Date().toISOString(),
        paused_at: null,
      });
      // immediate refresh so UI updates instantly
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setErr("");
    setBusy(true);
    try {
      await postSession({
        state: "stopped",
        playback_id: null,
        started_at: null,
        paused_at: null,
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800 }}>IMAOS Room Controller</div>

        <div style={{ fontSize: 14, opacity: 0.85 }}>
          room: <b>{roomId}</b> • state: <b>{remoteState}</b>
          {sessionLabel ? (
            <>
              {" "}
              • session: <b>{sessionLabel}</b>
            </>
          ) : null}
        </div>
      </div>

      {err ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,0,0,0.12)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          <b>Error:</b> {err}
        </div>
      ) : null}

      {/* Buttons grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          flex: 1,
        }}
      >
        {videos.map((label) => {
          const isActive = sessionLabel === label && remoteState === "playing";
          return (
            <button
              key={label}
              onClick={() => handlePick(label)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "18px 12px",
                borderRadius: 14,
                border: isActive
                  ? "2px solid rgba(255,255,255,0.9)"
                  : "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "#16a34a",
                color: "#000",
                fontWeight: 900,
                letterSpacing: 0.6,
                fontSize: 16,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Stop */}
      <button
        onClick={handleStop}
        disabled={busy}
        style={{
          width: "100%",
          padding: "18px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.18)",
          backgroundColor: "#374151",
          color: "#fff",
          fontWeight: 900,
          letterSpacing: 1,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        STOP
      </button>
    </div>
  );
}
