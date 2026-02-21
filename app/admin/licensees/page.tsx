import { redirect } from "next/navigation";
import { supabaseServerAnon } from "@/lib/supabase/server";

async function requireAdminPage() {
const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (row?.role || "").toString();
  if (!role) redirect("/login");

  return { role };
}

export default async function LicenseesAdminPage() {
  await requireAdminPage();
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>IMAOS Command Center</h1>
        <div style={{ marginTop: 6, opacity: 0.75 }}>Licensees</div>

        <div style={{ marginTop: 14 }}>
          {/* Client UI */}
          {/* This keeps server auth clean and UI interactive */}
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="/admin-licensees.js"></script>
          <div id="admin-licensees-root" />
        </div>
      </div>
    </div>
  );
}
