import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdmin() {
  const supabase = await supabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    redirect("/login?next=/admin");
  }

  const { data: row, error: roleErr } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr) {
    // If this happens, your RLS is blocking admin_users lookup
    redirect("/login?next=/admin");
  }

  const role = (row?.role || "").toString();
  const active = row?.active !== false;

  if (!active || !role) {
    redirect("/login?next=/admin");
  }

  return { role, email: user.email ?? "" };
}

export default async function AdminPage() {
  const { role, email } = await requireAdmin();

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          IMAOS Admin
        </h1>

        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Logged in as <b>{email || "unknown"}</b> — role <b>{role}</b>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <Link href="/admin/licensees" style={{ color: "#7dd3fc", fontSize: 18 }}>
            → Manage Licensees
          </Link>

          <Link href="/admin/users" style={{ color: "#7dd3fc", fontSize: 18 }}>
            → Manage Users (Invites)
          </Link>

          <a
            href="/api/admin/licensees"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → Test API: /api/admin/licensees
          </a>

          <a
            href="/api/admin/videos"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → Test API: /api/admin/videos
          </a>

          <a
            href="/api/admin/users"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → Test API: /api/admin/users
          </a>
        </div>

        <div style={{ marginTop: 22, padding: 14, border: "1px solid #333", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>If this page loads, auth is working.</div>
          <div style={{ opacity: 0.9 }}>
            If you still get redirected to login after logging in, then cookies still are not being set by the login flow.
          </div>
        </div>
      </div>
    </div>
  );
}
