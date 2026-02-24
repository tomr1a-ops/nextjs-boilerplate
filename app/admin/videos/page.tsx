import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import VideosClient from "./VideosClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdminPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/login?next=/admin/videos");
  const { data: row } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = String(row?.role || "");
  const active = row?.active !== false;
  if (!active || !role) redirect("/login?next=/admin/videos");
  return { role, email: user.email ?? "" };
}

export default async function VideosAdminPage() {
  const { role, email } = await requireAdminPage();
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) throw new Error("ADMIN_API_KEY is not defined.");

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <VideosClient adminKey={adminKey} />
      </div>
    </div>
  );
}
