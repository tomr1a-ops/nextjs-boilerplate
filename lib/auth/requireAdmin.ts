import { NextResponse } from "next/server";
import { supabaseServerAnon } from "@/lib/supabase/server";

/**
 * Require a logged-in user that exists in `admin_users` with an allowed role.
 *
 * Table expected:
 *   public.admin_users (user_id uuid pk, role text, created_at timestamptz default now())
 *
 * Allowed roles (default): super_admin, admin
 */
export async function requireAdminRole(
  allowed: string[] = ["super_admin", "admin"]
) {
  const supabase = await supabaseServerAnon();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    // Throwing a Response is the cleanest way to abort a route handler in Next
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: roleErr } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr) {
    throw NextResponse.json(
      { error: `Admin role lookup failed: ${roleErr.message}` },
      { status: 500 }
    );
  }

  const role = (row?.role || "").toString();

  if (!role || !allowed.includes(role)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user, role };
}
