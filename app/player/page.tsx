export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { headers } from "next/headers";

type PlayerVideo = {
  id: string;
  label: string;
  playback_id: string;
  sort_order?: number | null;
  active?: boolean | null;
};

function getBaseUrl() {
  // Works on Vercel + local
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

async function getJsonAbsolute(path: string) {
  const base = getBaseUrl();
  const url = base ? `${base}${path}` : path;

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  return { ok: res.ok, status: res.status, json, text };
}

export default async function PlayerPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = (searchParams?.code || "").trim().toUpperCase();

  let videos: PlayerVideo[] = [];
  let err = "";

  if (code) {
    const out = await getJsonAbsolute(
      `/api/player/videos?code=${encodeURIComponent(code)}`
    );

    if (!out.ok) {
      err = out.json?.error || out.text || `Request failed (${out.status})`;
    } else {
      videos = Array.isArray(out.json?.videos) ? out.json.videos : [];
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>IMAOS Player</h1>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Enter a licensee code (example: <b>AT100</b>)
        </div>

        <form
          method="GET"
          action="/player"
          style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
        >
          <input
            name="code"
            defaultValue={code}
            placeholder="Licensee code (e.g. AT100)"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
              width: 280,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #1f4d2a",
              background: "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Load Videos
          </button>
        </form>

        {err ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #7f1d1d",
              background: "#2a0f10",
              color: "#fecaca",
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : null}

        {code ? (
          <div style={{ marginTop: 14, opacity: 0.85 }}>
            Showing videos for code:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900 }}>
              {code}
            </span>
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          {code && videos.length === 0 && !err ? (
            <div style={{ opacity: 0.8 }}>No videos assigned to this licensee.</div>
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
                    {v.active === false ? (
                      <span style={{ marginLeft: 8, opacity: 0.7 }}>(inactive)</span>
                    ) : null}
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
        </div>
      </div>
    </div>
  );
}
