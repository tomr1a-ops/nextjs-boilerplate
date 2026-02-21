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

// List staff/admin users (simple list)
export async function GET(req: NextRequest) {
  try {
    // Only logged-in admins can view
    await requireAdminRole(req, ["super_admin", "admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("id,user_id,email,role,active,created_at")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ users: data ?? [] });
  } catch (e: any) {
    // your requireAdminRole throws NextResponse.json(...) — return it cleanly
    if (e instanceof NextResponse) return e;
    return jsonError(e?.message || "Server error", 500);
  }
}

// Create/invite a new staff user
export async function POST(req: NextRequest) {
  try {
    // Only super_admin should add staff
    await requireAdminRole(req, ["super_admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "staff").trim();
    const active = body.active !== false;

    if (!email) return jsonError("Missing email", 400);
    if (!["super_admin", "admin", "staff"].includes(role)) {
      return jsonError("Invalid role", 400);
    }

    // 1) Invite user by email (Supabase sends email)
    const invite = await supabase.auth.admin.inviteUserByEmail(email, {
      // IMPORTANT: set this to your login or onboarding page
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/login`,
    });

    if (invite.error) return jsonError(invite.error.message, 500);
    const userId = invite.data?.user?.id;
    if (!userId) return jsonError("Invite did not return a user id", 500);

    // 2) Upsert into admin_users table
    const { error: upsertErr } = await supabase
      .from("admin_users")
      .upsert(
        { user_id: userId, email, role, active },
        { onConflict: "user_id" }
      );

    if (upsertErr) return jsonError(upsertErr.message, 500);

    return NextResponse.json({
      ok: true,
      invited: email,
      user_id: userId,
      role,
      active,
    });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    return jsonError(e?.message || "Server error", 500);
  }
}
