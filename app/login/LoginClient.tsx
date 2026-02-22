// app/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const nextUrl = useMemo(() => {
    const next = (searchParams?.get("next") || "").trim();
    // Only allow internal redirects
    if (next.startsWith("/")) return next;
    return "/admin";
  }, [searchParams]);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const em = email.trim().toLowerCase();
      if (!em) {
        setErr("Email is required.");
        return;
      }
      if (!password) {
        setErr("Password is required.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // Hard redirect guarantees cookies/session settle before next page
      window.location.href = nextUrl || "/admin";
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Login</h1>
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 14 }}>
          After login you will go to <b>{nextUrl}</b>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
            }}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0f0f0f",
              color: "#fff",
              outline: "none",
            }}
          />

          {err ? (
            <div
              style={{
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

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #1f4d2a",
              background: loading ? "#14532d" : "#22c55e",
              color: "#000",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#1b1b1b",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
