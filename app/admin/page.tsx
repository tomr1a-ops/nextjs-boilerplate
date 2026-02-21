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

// List staff/admin users (from admin_users table)
export async function GET(req: NextRequest) {
  try {
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
      .select("user_id,email,role,active,created_at")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ users: data ?? [] });
  } catch (e: any) {
    // requireAdminRole may throw a Response
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}

// Create a new staff/admin user with a password (NO invite email)
export async function POST(req: NextRequest) {
  try {
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
    const password = String(body.password || "");
    const role = String(body.role || "staff").trim();
    const active = body.active !== false;

    if (!email) return jsonError("Missing email", 400);
    if (!password || password.length < 8)
      return jsonError("Password must be at least 8 characters", 400);

    if (!["super_admin", "admin", "staff"].includes(role)) {
      return jsonError("Invalid role", 400);
    }

    // 1) Create Supabase Auth user with a password (no email invite)
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // mark as confirmed so they can log in immediately
    });

    if (created.error) return jsonError(created.error.message, 500);

    const userId = created.data?.user?.id;
    if (!userId) return jsonError("Create user did not return a user id", 500);

    // 2) Insert/upsert into admin_users
    const { error: upsertErr } = await supabase
      .from("admin_users")
      .upsert({ user_id: userId, email, role, active }, { onConflict: "user_id" });

    if (upsertErr) return jsonError(upsertErr.message, 500);

    return NextResponse.json({
      ok: true,
      created: email,
      user_id: userId,
      role,
      active,
    });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}

// Delete staff/admin user (removes from Supabase Auth + admin_users)
export async function DELETE(req: NextRequest) {
  try {
    await requireAdminRole(req, ["super_admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();

    if (!userId) return jsonError("Missing user_id", 400);

    // Delete row in admin_users first (optional, either order is fine)
    const { error: delRowErr } = await supabase
      .from("admin_users")
      .delete()
      .eq("user_id", userId);

    if (delRowErr) return jsonError(delRowErr.message, 500);

    // Delete auth user
    const del = await supabase.auth.admin.deleteUser(userId);
    if (del.error) return jsonError(del.error.message, 500);

    return NextResponse.json({ ok: true, deleted_user_id: userId });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}
