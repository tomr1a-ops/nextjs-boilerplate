"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  const next = useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/") ? n : "/admin";
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // IMPORTANT: refresh server components so they see the new auth cookies/session
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520, border: "1px solid #222", borderRadius: 16, padding: 20, background: "#0f0f0f" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>IMAOS Login</h1>
        <div style={{ marginTop: 6, opacity: 0.75 }}>Sign in to access admin tools.</div>

        <form onSubmit={onLogin} style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0b0b0b",
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
              background: "#0b0b0b",
              color: "#fff",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
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

        {err ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #7f1d1d", background: "#2a0f10", color: "#fecaca", fontWeight: 700 }}>
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.65 }}>
          After login you’ll be sent to: <b>{next}</b>
        </div>
      </div>
    </div>
  );
}
