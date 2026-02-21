import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Only super_admin can modify roles
    await requireAdminRole(req as any, ["super_admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError("Missing Supabase config", 500);
    }

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || "");
    const role = body.role;
    const active = body.active;

    if (!user_id) return jsonError("Missing user_id", 400);

    const updates: any = {};

    if (role) {
      if (!["super_admin", "admin", "staff"].includes(role)) {
        return jsonError("Invalid role", 400);
      }
      updates.role = role;
    }

    if (typeof active === "boolean") {
      updates.active = active;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No updates provided", 400);
    }

    const { error } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("user_id", user_id);

    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
