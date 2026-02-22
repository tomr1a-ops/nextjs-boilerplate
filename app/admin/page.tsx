// app/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdmin() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login?next=/admin");

  const { data: row } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(row?.role || "");
  const active = row?.active !== false;

  if (!active || !role) redirect("/login?next=/admin");

  return { role, email: user.email ?? "" };
}

export default async function AdminPage() {
  const { role, email } = await requireAdmin();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          IMAOS Admin
        </h1>

        <div style={{ marginTop: 8, opacity: 0.9 }}>
          Logged in as <b>{email || "unknown"}</b> — role <b>{role}</b>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 12,
            maxWidth: 520,
          }}
        >
          <Link
            href="/admin/licensees"
            style={{
              display: "block",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #2a2a2a",
              background: "#101010",
              color: "#7dd3fc",
              fontSize: 18,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            → Manage Licensees
          </Link>

          <Link
            href="/admin/users"
            style={{
              display: "block",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #2a2a2a",
              background: "#101010",
              color: "#a7f3d0",
              fontSize: 18,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            → Manage Users
          </Link>

          <Link
            href="/admin/videos"
            style={{
              display: "block",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #2a2a2a",
              background: "#101010",
              color: "#fcd34d",
              fontSize: 18,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            → Manage Videos
          </Link>
        </div>

        <div style={{ marginTop: 18, opacity: 0.85, fontSize: 14 }}>
          Quick API checks:
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <a
            href="/api/admin/licensees"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → /api/admin/licensees
          </a>

          <a
            href="/api/admin/videos"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → /api/admin/videos
          </a>

          <a
            href="/api/admin/users"
            style={{ color: "#a7f3d0", fontSize: 16 }}
            target="_blank"
            rel="noreferrer"
          >
            → /api/admin/users
          </a>
        </div>
      </div>
    </div>
  );
}
