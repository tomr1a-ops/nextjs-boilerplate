import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function requireAdmin(req: NextRequest) {
  const key = (req.headers.get("x-admin-key") || "").trim();
  return Boolean(key && ADMIN_API_KEY && key === ADMIN_API_KEY);
}

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function clean(v: any) {
  return (v ?? "").toString().trim();
}

async function revokeByPairCode(req: NextRequest) {
  if (!ADMIN_API_KEY) return json(500, { error: "Missing ADMIN_API_KEY" });
  if (!requireAdmin(req)) return json(401, { error: "Unauthorized" });

  const supabase = getAdminSupabase();
  if (!supabase) return json(500, { error: "Server env missing" });

  const qp = clean(req.nextUrl.searchParams.get("pair_code"));
  const body = await req.json().catch(() => ({}));
  const pairCode = qp || clean(body?.pair_code);

  if (!pairCode) return json(400, { error: "Missing pair_code" });

  const { data, error } = await (supabase as any)
    .from("devices")
    .update({
      status: "revoked",
      device_token: null,
      approved_at: null,
    })
    .eq("pair_code", pairCode)
    .select("id, pair_code, status, device_token, licensee_id, approved_at, last_seen_at, active, created_at")
    .maybeSingle();

  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: "Device not found for that pair_code" });

  return json(200, { device: data });
}

export async function POST(req: NextRequest) {
  return revokeByPairCode(req);
}

export async function GET(req: NextRequest) {
  return revokeByPairCode(req);
}
