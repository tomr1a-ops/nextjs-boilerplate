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
    // Only super_admin can delete users
    await requireAdminRole(req as any, ["super_admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError("Missing Supabase config", 500);
    }

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || "");

    if (!user_id) return jsonError("Missing user_id", 400);

    // Prevent deleting yourself
    const { data: currentUser } = await supabase.auth.getUser();
    if (currentUser?.user?.id === user_id) {
      return jsonError("You cannot delete yourself", 400);
    }

    // 1️⃣ Delete from auth.users
    const { error: authError } =
      await supabase.auth.admin.deleteUser(user_id);

    if (authError) return jsonError(authError.message, 500);

    // 2️⃣ Clean up admin_users table
    await supabase
      .from("admin_users")
      .delete()
      .eq("user_id", user_id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
