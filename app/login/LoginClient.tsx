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

      if (error) {
        setErr(error.message || "Login failed");
        return;
      }

      // IMPORTANT: hard navigation so server sees cookies
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
          width: "min(520px, 100%)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 18 }}>
          IMAOS Admin Login
        </div>

        <div style={{ marginBottom: 10, opacity: 0.9 }}>Email</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
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
            border: "1px solid rgba(255,255,255,0.10)",
            background: loading ? "rgba(16,140,55,0.5)" : "#16a34a",
            color: "#000",
            fontWeight: 900,
            fontSize: 22,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {err ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.18)",
              color: "rgba(255,220,220,0.95)",
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : (
          <div style={{ marginTop: 14, opacity: 0.7 }}>
            You must be in <span style={{ fontFamily: "monospace" }}>admin_users</span> to access admin pages.
          </div>
        )}
      </form>
    </div>
  );
}
