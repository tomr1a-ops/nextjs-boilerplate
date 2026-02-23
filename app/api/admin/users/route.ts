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

// GET /api/admin/users - List all admin users
export async function GET(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, user_id, role, active, created_at")
      .order("created_at", { ascending: false });

    if (error) return json(500, { error: error.message });

    // Get emails from auth.users
    const usersWithEmails = await Promise.all(
      (data || []).map(async (adminUser) => {
        if (!adminUser.user_id) return { ...adminUser, email: null };
        
        const { data: authUser } = await supabase.auth.admin.getUserById(adminUser.user_id);
        return {
          ...adminUser,
          email: authUser?.user?.email || null,
        };
      })
    );

    return json(200, { users: usersWithEmails });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// POST /api/admin/users - Create new admin user
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) return json(400, { error: authError.message });
    if (!authData.user) return json(500, { error: "User creation failed" });

    // Create admin_users entry
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .insert([
        {
          user_id: authData.user.id,
          role,
          active: true,
        },
      ])
      .select("id, user_id, role, active, created_at")
      .single();

    if (adminError) {
      // Rollback: delete auth user if admin_users insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return json(500, { error: adminError.message });
    }

    return json(200, { 
      user: {
        ...adminUser,
        email: authData.user.email,
      }
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PATCH /api/admin/users?id=UUID - Update admin user
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
      .select("id, user_id, role, active, created_at")
      .single();

    if (error) return json(500, { error: error.message });

    // Get email
    const { data: authUser } = await supabase.auth.admin.getUserById(data.user_id);

    return json(200, { 
      user: {
        ...data,
        email: authUser?.user?.email || null,
      }
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// DELETE /api/admin/users?id=UUID - Delete admin user
export async function DELETE(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return json(400, { error: "Missing id" });

    // Get user_id before deleting
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!adminUser) return json(404, { error: "User not found" });

    // Delete from admin_users
    const { error: deleteError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", id);

    if (deleteError) return json(500, { error: deleteError.message });

    // Delete from auth.users
    if (adminUser.user_id) {
      await supabase.auth.admin.deleteUser(adminUser.user_id);
    }

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
