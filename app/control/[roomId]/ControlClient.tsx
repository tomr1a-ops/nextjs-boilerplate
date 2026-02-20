"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type VideoRow = {
  label: string;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  id?: string;
  created_at?: string;
};

function clean(input: any) {
  return (input ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

export default function ControlClient({ roomId }: { roomId: string }) {
  const params = useParams() as { roomId?: string } | null;

  // Derive room id in a bulletproof way (prop → params → pathname)
  const derived = useMemo(() => {
    const fromProp = clean(roomId);
    if (fromProp) return { raw: roomId, clean: fromProp, source: "prop" as const };

    const fromParams = clean(params?.roomId);
    if (fromParams) return { raw: params?.roomId ?? "", clean: fromParams, source: "useParams" as const };

    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1] || "";
      const fromPath = clean(last);
      if (fromPath) return { raw: last, clean: fromPath, source: "pathname" as const };
    }

    return { raw: "", clean: "", source: "none" as const };
  }, [roomId, params?.roomId]);

  const rid = derived.clean;

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [err, setErr] = useState("");
  const [state, setState] = useState<string>("unknown");
  const [loading, setLoading] = useState(true);

  async function loadVideos() {
    if (!rid) return;
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/videos?room=${encodeURIComponent(rid)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
      setVideos(Array.isArray(json?.videos) ? json.videos : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadState() {
    if (!rid) return;
    try {
      const res = await fetch(`/api/session?room=${encodeURIComponent(rid)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok) setState(String(json?.state || "unknown"));
    } catch {
      // ignore
    }
  }

  async function postSession(body: any) {
    if (!rid) return;
    setErr("");
    const res = await fetch(`/api/session?room=${encodeURIComponent(rid)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`(${res.status}) ${txt || "Request failed"}`);
    }
  }

  async function playLabel(label: string) {
    try {
      await postSession({
        state: "playing",
        playback_id: label, // labels allowed; API resolves label → playback_id if needed
        started_at: new Date().toISOString(),
        paused_at: null,
      });
      await loadState();
    } catch (e: any) {
      setErr(e?.message || "Play failed");
    }
  }

  async function pause() {
    try {
      await postSession({ state: "paused", paused_at: new Date().toISOString() });
      await loadState();
    } catch (e: any) {
      setErr(e?.message || "Pause failed");
    }
  }

  async function stop() {
    try {
      await postSession({ state: "stopped", playback_id: null });
      await loadState();
    } catch (e: any) {
      setErr(e?.message || "Stop failed");
    }
  }

  async function seekDelta(delta: number) {
    try {
      await postSession({ command: "seek_delta", value: delta });
      await loadState();
    } catch (e: any) {
      setErr(e?.message || "Seek failed");
    }
  }

  useEffect(() => {
    if (!rid) return;
    loadVideos();
    loadState();
    const iv = setInterval(loadState, 1500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>
          IMAOS Control — {rid || "missing"}
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            fontWeight: 900,
          }}
        >
          State: {state}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Raw prop: <span style={{ fontFamily: "monospace" }}>{String(roomId)}</span> • Derived:{" "}
        <span style={{ fontFamily: "monospace" }}>{derived.clean || "(none)"}</span> • Source:{" "}
        <span style={{ fontFamily: "monospace" }}>{derived.source}</span>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button
          onClick={pause}
          style={{
            padding: "16px 24px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "#374151",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          PAUSE
        </button>

        <button
          onClick={stop}
          style={{
            padding: "16px 24px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "#b91c1c",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          STOP
        </button>

        <button
          onClick={() => seekDelta(-10)}
          style={{
            padding: "16px 24px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "#374151",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          RW 10s
        </button>

        <button
          onClick={() => seekDelta(10)}
          style={{
            padding: "16px 24px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "#374151",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          FF 10s
        </button>

        <button
          onClick={loadVideos}
          style={{
            padding: "16px 24px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          REFRESH LIST
        </button>
      </div>

      <div style={{ marginTop: 18, opacity: 0.8, fontSize: 14 }}>
        Allowed videos for this room
      </div>

      {err ? (
        <div
          style={{
            marginTop: 12,
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

      {loading ? (
        <div style={{ marginTop: 14, opacity: 0.7 }}>Loading…</div>
      ) : videos.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            border: "2px dashed rgba(255,255,255,0.25)",
            padding: 18,
            borderRadius: 16,
            opacity: 0.7,
          }}
        >
          No allowed videos found for <b>{rid || "missing"}</b>.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {videos.map((v) => (
            <button
              key={v.label}
              onClick={() => playLabel(v.label)}
              style={{
                padding: "14px 10px",
                borderRadius: 14,
                border: "1px solid #1f1f1f",
                background: "#39d353",
                color: "#000",
                fontWeight: 900,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
