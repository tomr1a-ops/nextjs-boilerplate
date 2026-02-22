import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function json(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function requireAdminKey(req: NextRequest) {
  const got = (req.headers.get("x-admin-key") || "").trim();
  const expected = (process.env.ADMIN_API_KEY || "").trim();
  if (!expected) return { ok: false, error: "Server missing ADMIN_API_KEY" };
  if (!got || got !== expected) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/admin/devices  (lists pending/active/revoked)
export async function GET(req: NextRequest) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await (supabase as any)
      .from("devices")
      .select("id,name,pair_code,device_token,licensee_id,status,created_at,approved_at,last_seen_at,active")
      .order("created_at", { ascending: false });

    if (error) return json(500, { error: error.message });
    return json(200, { devices: data ?? [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
