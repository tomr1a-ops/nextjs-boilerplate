"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });

      if (error) throw error;

      window.location.href = "/admin";
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 18 }}>
      <div style={{ maxWidth: 520, margin: "80px auto", padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>IMAOS Admin Login</div>

        <form onSubmit={onSubmit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              outline: "none",
            }}
          />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            type="password"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#16a34a",
              color: "#000",
              fontWeight: 900,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>

          {err && (
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.12)" }}>
              {err}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
