// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  // any admin/staff manager should be able to view
  await requireAdminRole(req, ["super_admin", "admin"]);

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,email,role,active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  await requireAdminRole(req, ["super_admin", "admin"]);

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const user_id = String(body.user_id || "").trim();
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const patch: any = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.role === "string" && body.role.trim()) patch.role = body.role.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("admin_users").update(patch).eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
