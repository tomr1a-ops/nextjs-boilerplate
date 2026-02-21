"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If user is not signed in, this page won't work
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login?error=Please%20open%20the%20invite%20link%20again");
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!password || password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg(error.message);
        return;
      }

      // Optional: sign them out so they log back in normally
      await supabase.auth.signOut();

      router.replace("/login?success=Password%20set.%20Please%20log%20in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Set Password</h1>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          Create a password for your staff account.
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>New password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid #2a2a2a",
                background: "#0f0f0f",
                color: "#fff",
                fontSize: 16,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.85 }}>Confirm password</span>
            <input
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              type="password"
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid #2a2a2a",
                background: "#0f0f0f",
                color: "#fff",
                fontSize: 16,
              }}
            />
          </label>

          <button
            disabled={loading}
            type="submit"
            style={{
              marginTop: 6,
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "#16a34a",
              color: "#000",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : "Set Password"}
          </button>

          {msg && (
            <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: "#3b0d0d", border: "1px solid #7f1d1d" }}>
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
