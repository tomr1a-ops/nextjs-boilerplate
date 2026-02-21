"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GateState =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "blocked"; message: string };

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null, text };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

export default function AdminPage() {
  const [gate, setGate] = useState<GateState>({ status: "checking" });

  useEffect(() => {
    const run = async () => {
      try {
        // Any admin API route that requires logged-in admin cookies works here.
        const res = await fetch("/api/admin/licensees", { cache: "no-store" });
        const out = await safeJson(res);

        if (out.status === 401 || out.status === 403) {
          // Not logged in or not authorized
          window.location.href = "/login?next=/admin";
          return;
        }

        if (!out.ok) {
          setGate({
            status: "blocked",
            message: out.json?.error || out.text || `Admin check failed (${out.status})`,
          });
          return;
        }

        setGate({ status: "ok" });
      } catch (e: any) {
        setGate({ status: "blocked", message: e?.message || "Admin check failed" });
      }
    };

    run();
  }, []);

  if (gate.status === "checking") {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>IMAOS Admin</h1>
          <div style={{ marginTop: 10, opacity: 0.8 }}>Checking access…</div>
        </div>
      </div>
    );
  }

  if (gate.status === "blocked") {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>IMAOS Admin</h1>
          <div style={{ marginTop: 10, opacity: 0.9 }}>Blocked:</div>
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.25)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {gate.message}
          </div>

          <div style={{ marginTop: 14 }}>
            <a
              href="/login?next=/admin"
              style={{ color: "#7dd3fc", fontWeight: 900, fontSize: 18 }}
            >
              → Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // OK
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>IMAOS Admin</h1>

        <div style={{ marginTop: 10, opacity: 0.85 }}>
          You are authenticated (admin API check passed).
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <Link href="/admin/licensees" style={{ color: "#7dd3fc", fontSize: 18 }}>
            → Manage Licensees
          </Link>

          <Link href="/admin/users" style={{ color: "#7dd3fc", fontSize: 18 }}>
            → Manage Users
          </Link>

          <a
            href="/api/admin/licensees"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#a7f3d0", fontSize: 16 }}
          >
            → Test API: /api/admin/licensees
          </a>

          <a
            href="/api/admin/videos"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#a7f3d0", fontSize: 16 }}
          >
            → Test API: /api/admin/videos
          </a>

          <a
            href="/api/admin/users"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#a7f3d0", fontSize: 16 }}
          >
            → Test API: /api/admin/users
          </a>
        </div>
      </div>
    </div>
  );
}
