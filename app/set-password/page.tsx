"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function SetPasswordPage() {
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!pw1 || pw1.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setMsg("Passwords do not match.");

    setBusy(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseAnon, {
        auth: { persistSession: true, autoRefreshToken: true },
      });

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setMsg("No session found. Please re-open your invite link.");
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("Password set. Redirecting to admin…");
      setTimeout(() => router.replace("/admin"), 600);
    } catch (e: any) {
      setMsg(e?.message || "Could not set password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Set Password</h1>
        <div style={{ marginTop: 8, opacity: 0.75 }}>Finish creating your staff account.</div>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>New Password</div>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Confirm Password</div>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff" }}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 6,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: busy ? "#0b5" : "#16a34a",
              color: "#000",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {busy ? "Saving…" : "Set Password"}
          </button>

          {msg && (
            <div style={{ marginTop: 6, padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)" }}>
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
