import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdminPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login?next=/admin/users");

  const { data: row } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(row?.role || "");
  const active = row?.active !== false;

  if (!active || !role) redirect("/login?next=/admin/users");

  return { role, email: user.email ?? "" };
}

export default async function AdminUsersPage() {
  await requireAdminPage();
  
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    throw new Error("ADMIN_API_KEY is not defined in environment variables.");
  }

  return <UsersClient adminKey={adminKey} />;
}
