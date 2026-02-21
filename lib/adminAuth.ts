import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export async function requireAdminRole(
  req?: NextRequest,
  allowedRoles: string[] = ["super_admin", "admin"]
): Promise<{ user: any; role: string; res?: NextResponse }> {
  // 1) Use the cookie session (anon) to get the currently logged-in user
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    return {
      user: null,
      role: "",
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // 2) Use service role to read admin_users (no RLS issues)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return {
      user,
      role: "",
      res: NextResponse.json(
        { error: "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      ),
    };
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: row, error } = await admin
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      user,
      role: "",
      res: NextResponse.json({ error: `Admin role lookup failed: ${error.message}` }, { status: 403 }),
    };
  }

  const role = (row?.role || "").toString();

  if (!role || (allowedRoles.length && !allowedRoles.includes(role))) {
    return {
      user,
      role,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, role };
}
