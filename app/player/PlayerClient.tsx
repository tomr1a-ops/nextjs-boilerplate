"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PlayerVideo = {
  id: string;
  label: string;
  playback_id: string;
  sort_order?: number | null;
  active?: boolean | null;
};

function cleanCode(input: any) {
  return (input ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export default function PlayerClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialCode = useMemo(() => cleanCode(sp.get("code") || ""), [sp]);

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [inactive, setInactive] = useState(false);
  const [videos, setVideos] = useState<PlayerVideo[]>([]);

  async function loadVideos(nextCode?: string) {
    const c = cleanCode(nextCode ?? code);
    if (!c) return;

    setLoading(true);
    setErr("");
    setInactive(false);
    setVideos([]);

    try {
      const res = await fetch(`/api/player/videos?code=${encodeURIComponent(c)}&t=${Date.now()}`, {
        cache: "no-store",
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (res.status === 403) {
        setInactive(true);
        setErr(json?.error || "License inactive");
        return;
      }

      if (!res.ok) {
        setErr(json?.error || text || `Request failed (${res.status})`);
        return;
      }

      const list = Array.isArray(json?.videos) ? json.videos : [];
      setVideos(list);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = cleanCode(code);
    router.replace(`/player?code=${encodeURIComponent(c)}`);
    loadVideos(c);
  }

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      loadVideos(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>IMAOS Player</h1>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Enter a licensee code (example: <b>AT100</b>)
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="Licensee code (e.g. AT100)"
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
              width: 340,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontSize: 18,
            }}
          />
          <button
            type="submit"
            disabled={!code || loading}
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid #1f4d2a",
              background: "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: !code || loading ? "not-allowed" : "pointer",
              opacity: !code || loading ? 0.6 : 1,
              fontSize: 18,
            }}
          >
            {loading ? "Loading…" : "Load Videos"}
          </button>
        </form>

        {inactive ? (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            🚫 License is inactive. Please contact support.
          </div>
        ) : null}

        {err && !inactive ? (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #7f1d1d",
              background: "#2a0f10",
              color: "#fecaca",
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div style={{ marginTop: 18, opacity: 0.85, fontWeight: 800 }}>
            Showing videos for code:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {code}
            </span>
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              marginTop: 12,
            }}
          >
            {videos.map((v) => (
              <div
                key={v.id}
                style={{
                  border: "1px solid #222",
                  borderRadius: 14,
                  background: "#0f0f0f",
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {v.label}
                  {v.active === false ? <span style={{ marginLeft: 8, opacity: 0.7 }}>(inactive)</span> : null}
                </div>

                <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
                  playback_id:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {v.playback_id}
                  </span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <video
                    controls
                    playsInline
                    style={{ width: "100%", borderRadius: 12, background: "#000" }}
                    src={`https://stream.mux.com/${encodeURIComponent(v.playback_id)}.m3u8`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && code && videos.length === 0 && !err && !inactive ? (
          <div style={{ marginTop: 16, opacity: 0.8 }}>No videos assigned to this licensee.</div>
        ) : null}
      </div>
    </div>
  );
}
