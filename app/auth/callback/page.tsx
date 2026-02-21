"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    const run = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseAnon) {
          setMsg("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnon, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        // Supabase can return either:
        // - tokens in URL hash (#access_token=...) for implicit flows
        // - or ?code=... for PKCE
        const hasCode = new URLSearchParams(window.location.search).get("code");
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
        }

        setMsg("Signed in. Redirecting…");
        window.location.replace(next);
      } catch (e: any) {
        setMsg(e?.message || "Failed to finish sign-in.");
      }
    };

    run();
  }, [next]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>IMAOS</h1>
        <div style={{ marginTop: 10, opacity: 0.85 }}>{msg}</div>
        <div style={{ marginTop: 10, opacity: 0.6, fontSize: 13 }}>
          If this hangs, your browser blocked third-party cookies or your Supabase Redirect URLs don’t include this domain.
        </div>
      </div>
    </div>
  );
}
