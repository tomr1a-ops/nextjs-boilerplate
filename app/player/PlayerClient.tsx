"use client";

import { useEffect, useState } from "react";

type PlayerVideo = {
  id: string;
  label: string;
  playback_id: string;
  sort_order?: number | null;
  active?: boolean | null;
};

const LS_TOKEN = "imaos_device_token";
const LS_PAIR = "imaos_pair_code";
const LS_LICCODE = "imaos_licensee_code";

export default function PlayerClient() {
  const [deviceToken, setDeviceToken] = useState<string>("");
  const [licenseeCode, setLicenseeCode] = useState<string>("");
  const [pairCode, setPairCode] = useState<string>("");

  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [err, setErr] = useState<string>("");
  const [status, setStatus] = useState<"unpaired" | "pending" | "paired">("unpaired");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const t = localStorage.getItem(LS_TOKEN) || "";
    const p = localStorage.getItem(LS_PAIR) || "";
    const c = localStorage.getItem(LS_LICCODE) || "";
    if (t) {
      setDeviceToken(t);
      setStatus("paired");
    } else {
      setStatus("unpaired");
    }
    if (p) setPairCode(p);
    if (c) setLicenseeCode(c);
  }, []);

  async function loadVideos(tokenOverride?: string) {
    const token = tokenOverride || deviceToken;
    if (!token) return;

    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/player/videos", {
        cache: "no-store",
        headers: { "x-device-token": token },
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(json?.error || text || `Request failed (${res.status})`);
      }

      setVideos(Array.isArray(json?.videos) ? json.videos : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitPair() {
    setErr("");
    const code = licenseeCode.trim().toUpperCase();
    const pair = pairCode.trim();

    if (!code || !pair) {
      setErr("Enter licensee code and pair code.");
      return;
    }

    localStorage.setItem(LS_PAIR, pair);
    localStorage.setItem(LS_LICCODE, code);

    setLoading(true);
    try {
      const res = await fetch("/api/device/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensee_code: code, pair_code: pair }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || `Pair failed (${res.status})`);

      if (json?.status === "active" && json?.device_token) {
        localStorage.setItem(LS_TOKEN, json.device_token);
        setDeviceToken(json.device_token);
        setStatus("paired");
        await loadVideos(json.device_token);
      } else {
        setStatus("pending");
      }
    } catch (e: any) {
      setErr(e?.message || "Pair failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkApproval() {
    setErr("");
    const pair = (pairCode || localStorage.getItem(LS_PAIR) || "").trim();
    if (!pair) {
      setErr("Missing pair code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/device/pair?pair_code=${encodeURIComponent(pair)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || `Check failed (${res.status})`);

      if (json?.status === "active" && json?.device_token) {
        localStorage.setItem(LS_TOKEN, json.device_token);
        setDeviceToken(json.device_token);
        setStatus("paired");
        await loadVideos(json.device_token);
      } else {
        setStatus("pending");
      }
    } catch (e: any) {
      setErr(e?.message || "Check failed");
    } finally {
      setLoading(false);
    }
  }

  function resetPairing() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_PAIR);
    localStorage.removeItem(LS_LICCODE);
    setDeviceToken("");
    setVideos([]);
    setStatus("unpaired");
    setErr("");
  }

  // Auto-load if already paired
  useEffect(() => {
    if (status === "paired" && deviceToken) loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, deviceToken]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900 }}>IMAOS Player</h1>
          <div style={{ opacity: 0.8, fontWeight: 800 }}>
            Status:{" "}
            <span style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        {err ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #7f1d1d", background: "#2a0f10", color: "#fecaca", fontWeight: 800 }}>
            {err}
          </div>
        ) : null}

        {/* Pairing UI */}
        {status !== "paired" ? (
          <div style={{ marginTop: 18, border: "1px solid #222", borderRadius: 16, background: "#0f0f0f", padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Pair this device</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Enter the licensee code + a pair code. Then you (admin) approve it in IMAOS Admin.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <input
                value={licenseeCode}
                onChange={(e) => setLicenseeCode(e.target.value)}
                placeholder="Licensee code (e.g. AT100)"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff",
                  width: 260,
                  fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              />

              <input
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                placeholder="Pair code (you provide)"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff",
                  width: 260,
                  fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
                  fontWeight: 900,
                }}
              />

              <button
                onClick={submitPair}
                disabled={loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #1f4d2a",
                  background: "#22c55e",
                  color: "#000",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                Submit Pair Request
              </button>

              {status === "pending" ? (
                <button
                  onClick={checkApproval}
                  disabled={loading}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#374151",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  Check Approval
                </button>
              ) : null}
            </div>

            {status === "pending" ? (
              <div style={{ marginTop: 12, opacity: 0.8, fontWeight: 800 }}>
                Pending approval. Go to Admin → Devices and click “Approve”.
              </div>
            ) : null}
          </div>
        ) : (
          // Paired UI
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => loadVideos()}
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #1f4d2a",
                background: "#22c55e",
                color: "#000",
                fontWeight: 900,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              Refresh
            </button>

            <button
              onClick={resetPairing}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#374151",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Reset Pairing
            </button>
          </div>
        )}

        {/* Videos */}
        {status === "paired" ? (
          <div style={{ marginTop: 18 }}>
            {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}

            {!loading && videos.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No videos assigned to this licensee.</div>
            ) : null}

            {videos.length > 0 ? (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
                {videos.map((v) => (
                  <div key={v.id} style={{ border: "1px solid #222", borderRadius: 14, background: "#0f0f0f", padding: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{v.label}</div>

                    <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
                      playback_id:{" "}
                      <span style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
