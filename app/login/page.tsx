"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) return setErr(error.message);

    // go to command center
    window.location.href = "/admin/licensees";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={onLogin} style={{ width: "100%", maxWidth: 420, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 18, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>IMAOS Admin Login</div>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
          style={{ width: "100%", padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", marginTop: 6, marginBottom: 12 }} />

        <label style={{ fontSize: 13, opacity: 0.85 }}>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
          style={{ width: "100%", padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", marginTop: 6, marginBottom: 12 }} />

        {err ? (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.18)" }}>
            {err}
          </div>
        ) : null}

        <button disabled={busy} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "#16a34a", color: "#000", fontWeight: 900, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          You must be in <code>admin_users</code> to access admin pages.
        </div>
      </form>
    </div>
  );
}
