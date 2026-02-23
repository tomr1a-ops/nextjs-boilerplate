import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function requireAdminKey(req: Request) {
  const got = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return { ok: false, error: "Server missing ADMIN_API_KEY" };
  if (!got || got !== expected) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server env missing");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/admin/users
export async function GET(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, user_id, email, role, active, created_at")
      .order("created_at", { ascending: false });

    if (error) return json(500, { error: error.message });

    return json(200, { users: data || [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// POST /api/admin/users
export async function POST(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    const role = String(body?.role || "staff").trim();

    if (!email || !password) {
      return json(400, { error: "Email and password required" });
    }

    if (!["staff", "super_admin"].includes(role)) {
      return json(400, { error: "Invalid role" });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return json(400, { error: `Auth error: ${authError.message}` });
    }
    if (!authData.user) {
      console.error("No user data returned from auth");
      return json(500, { error: "User creation failed - no user data returned" });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .insert([
        {
          user_id: authData.user.id,
          email: authData.user.email,
          role,
          active: true,
        },
      ])
      .select("id, user_id, email, role, active, created_at")
      .single();

    if (adminError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return json(500, { error: adminError.message });
    }

    return json(200, { user: adminUser });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PATCH /api/admin/users?id=UUID
export async function PATCH(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const body = await req.json().catch(() => ({}));

    if (!id) return json(400, { error: "Missing id" });

    const updateData: any = {};
    
    if (body.role !== undefined) {
      if (!["staff", "super_admin"].includes(body.role)) {
        return json(400, { error: "Invalid role" });
      }
      updateData.role = body.role;
    }
    
    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    if (Object.keys(updateData).length === 0) {
      return json(400, { error: "No fields to update" });
    }

    const { data, error } = await supabase
      .from("admin_users")
      .update(updateData)
      .eq("id", id)
      .select("id, user_id, email, role, active, created_at")
      .single();

    if (error) return json(500, { error: error.message });

    return json(200, { user: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// DELETE /api/admin/users?id=UUID
export async function DELETE(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return json(400, { error: "Missing id" });

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!adminUser) return json(404, { error: "User not found" });

    const { error: deleteError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", id);

    if (deleteError) return json(500, { error: deleteError.message });

    if (adminUser.user_id) {
      await supabase.auth.admin.deleteUser(adminUser.user_id);
    }

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
