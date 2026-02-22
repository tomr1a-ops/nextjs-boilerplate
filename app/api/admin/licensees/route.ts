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

function parseBool(v: any): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "active"].includes(s)) return true;
    if (["0", "false", "no", "n", "off", "inactive"].includes(s)) return false;
  }
  return null;
}

// shared handler for PATCH/PUT
async function updateActive(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const url = new URL(req.url);

    // Allow BOTH:
    // 1) JSON body: { id, active }
    // 2) Query string: ?id=UUID&active=false
    const body = await req.json().catch(() => ({}));

    const id =
      String(body?.id || "").trim() ||
      String(url.searchParams.get("id") || "").trim();

    // active can be in body.active OR body.status OR query active/status
    const activeCandidate =
      body?.active ??
      body?.status ??
      url.searchParams.get("active") ??
      url.searchParams.get("status");

    const activeParsed = parseBool(activeCandidate);

    if (!id) return json(400, { error: "Missing id" });
    if (activeParsed === null) return json(400, { error: "Missing/invalid active (true/false)" });

    const { data, error } = await supabase
      .from("licensees")
      .update({ active: activeParsed })
      .eq("id", id)
      .select("id, name, code, email, active, created_at")
      .maybeSingle();

    if (error) return json(500, { error: error.message });
    return json(200, { licensee: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
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

// PATCH /api/admin/licensees   body: { id, active }  OR  /api/admin/licensees?id=UUID&active=false
export async function PATCH(req: Request) {
  return updateActive(req);
}

// ✅ ADD THIS: some frontends use PUT for updates
export async function PUT(req: Request) {
  return updateActive(req);
}
