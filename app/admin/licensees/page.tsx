import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import LicenseesClient from "./LicenseesClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdminPage() {
  const supabase = await supabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login?next=/admin/licensees");

  const { data: row } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(row?.role || "");
  const active = row?.active !== false;

  if (!active || !role) redirect("/login?next=/admin/licensees");

  return { role, email: user.email ?? "" };
}

export default async function LicenseesAdminPage() {
  const { role, email } = await requireAdminPage();

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>IMAOS Admin</h1>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Logged in as <b>{email || "unknown"}</b> — role <b>{role}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/admin" style={{ color: "#7dd3fc", textDecoration: "none", fontSize: 16 }}>
              ← Admin Home
            </Link>
            <Link href="/admin/users" style={{ color: "#7dd3fc", textDecoration: "none", fontSize: 16 }}>
              Manage Users →
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 14, border: "1px solid #333", borderRadius: 14 }}>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 10 }}>
            Licensees management (powered by <code>/api/admin/licensees</code>)
          </div>
          <LicenseesClient />
        </div>
      </div>
    </div>
  );
}
