import { NextResponse } from "next/server";
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
  if (!url || !key) throw new Error("Server env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/admin/licensees
export async function GET(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("licensees")
      .select("id, name, code, email, active, created_at")
      .order("created_at", { ascending: false });

    if (error) return json(500, { error: error.message });
    return json(200, { licensees: data || [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// POST /api/admin/licensees
export async function POST(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const code = String(body?.code || "").trim().toUpperCase();
    const email = body?.email ? String(body.email).trim() : null;

    if (!name || !code) return json(400, { error: "Missing name or code" });

    const { data, error } = await supabase
      .from("licensees")
      .insert([{ name, code, email, active: true }])
      .select("id, name, code, email, active, created_at")
      .maybeSingle();

    if (error) return json(500, { error: error.message });
    return json(200, { licensee: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// DELETE /api/admin/licensees?id=UUID
export async function DELETE(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return json(400, { error: "Missing id" });

    const { error } = await supabase.from("licensees").delete().eq("id", id);
    if (error) return json(500, { error: error.message });

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PATCH /api/admin/licensees  body: { id, active }
export async function PATCH(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const id = String(body?.id || "").trim();
    const active = !!body?.active;

    if (!id) return json(400, { error: "Missing id" });

    const { data, error } = await supabase
      .from("licensees")
      .update({ active })
      .eq("id", id)
      .select("id, name, code, email, active, created_at")
      .maybeSingle();

    if (error) return json(500, { error: error.message });
    return json(200, { licensee: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
