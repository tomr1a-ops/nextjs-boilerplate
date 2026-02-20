"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export default function LoginClient() {
  const [email, setEmail] = useState("tom@imaimpact.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const e1 = clean(email).toLowerCase();
    const p1 = clean(password);

    if (!e1) return setErr("Enter your email.");
    if (!p1) return setErr("Enter your password.");

    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: e1,
        password: p1,
      });

      if (error) throw error;

      // hard navigation so server sees auth cookies immediately
      window.location.href = "/admin";
    } catch (ex: any) {
      setErr(ex?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(680px, 100%)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 900, marginBottom: 18 }}>
          IMAOS Admin Login
        </div>

        {err ? (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.18)",
              color: "rgba(255,220,220,0.95)",
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ marginBottom: 10, opacity: 0.9 }}>Email</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          style={{
            width: "100%",
            padding: "18px 18px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(235,242,255,1)",
            color: "#000",
            fontSize: 18,
            outline: "none",
            marginBottom: 18,
          }}
        />

        <div style={{ marginBottom: 10, opacity: 0.9 }}>Password</div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          style={{
            width: "100%",
            padding: "18px 18px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(235,242,255,1)",
            color: "#000",
            fontSize: 18,
            outline: "none",
            marginBottom: 18,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "18px 18px",
            borderRadius: 18,
            border: "none",
            background: loading ? "rgba(0,200,80,0.55)" : "#16a34a",
            color: "#000",
            fontSize: 22,
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ marginTop: 14, opacity: 0.65 }}>
          You must be in <code>admin_users</code> to access admin pages.
        </div>
      </form>
    </div>
  );
}
