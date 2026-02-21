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

async function guard(req: NextRequest, roles: string[]) {
  // IMPORTANT:
  // requireAdminRole in this repo may either:
  //  - return a Response (unauthorized) OR
  //  - throw a Response OR
  //  - return void (authorized)
  const result: any = await requireAdminRole(req as any, roles).catch((e: any) => e);

  // If it threw/returned a Response, normalize to JSON so the UI can parse it.
  if (result instanceof Response) {
    // try to read error body if any, else return a clean JSON error
    return jsonError("Unauthorized", 401);
  }

  // If it returned something that looks like a Response
  if (result && typeof result === "object" && "status" in result && "headers" in result) {
    return jsonError("Unauthorized", 401);
  }

  return null;
}

// List staff/admin users
export async function GET(req: NextRequest) {
  try {
    const denied = await guard(req, ["super_admin", "admin"]);
    if (denied) return denied;

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    // NOTE: your table does NOT have admin_users.id, so do NOT select it.
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id,email,role,active,created_at")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ users: data ?? [] });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}

// Invite a new staff user
export async function POST(req: NextRequest) {
  try {
    const denied = await guard(req, ["super_admin"]);
    if (denied) return denied;

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

    const site =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      "";

    // Invite user by email (Supabase sends email)
    const invite = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: site ? `${site.replace(/\/$/, "")}/login` : undefined,
    });

    if (invite.error) return jsonError(invite.error.message, 500);

    const userId = invite.data?.user?.id;
    if (!userId) return jsonError("Invite did not return a user id", 500);

    // Upsert into admin_users
    const { error: upsertErr } = await supabase
      .from("admin_users")
      .upsert({ user_id: userId, email, role, active }, { onConflict: "user_id" });

    if (upsertErr) return jsonError(upsertErr.message, 500);

    return NextResponse.json({
      ok: true,
      invited: email,
      user_id: userId,
      role,
      active,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
