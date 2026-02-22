import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function requireAdmin(req: NextRequest) {
  const key = (req.headers.get("x-admin-key") || "").trim();
  return Boolean(key && ADMIN_API_KEY && key === ADMIN_API_KEY);
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

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/admin/devices
 * Returns devices grouped by status
 */
export async function GET(req: NextRequest) {
  if (!ADMIN_API_KEY) return json(500, { error: "Missing ADMIN_API_KEY" });
  if (!requireAdmin(req)) return json(401, { error: "Unauthorized" });

  const supabase = getAdminSupabase();
  if (!supabase) return json(500, { error: "Server env missing" });

  const { data, error } = await (supabase as any)
    .from("devices")
    .select("id,pair_code,status,device_token,licensee_id,created_at,approved_at,last_seen_at,active")
    .order("created_at", { ascending: false });

  if (error) return json(500, { error: error.message });

  const devices = data ?? [];
  return json(200, {
    pending: devices.filter((d: any) => (d.status || "").toLowerCase() === "pending"),
    active: devices.filter((d: any) => (d.status || "").toLowerCase() === "active"),
    revoked: devices.filter((d: any) => (d.status || "").toLowerCase() === "revoked"),
    all: devices,
  });
}

/**
 * POST /api/admin/devices
 * Body:
 * { action: "approve" | "revoke", pair_code: "...." }
 *
 * Approve: ensures device_token exists, sets status=active, approved_at=now
 * Revoke: sets status=revoked, active=false
 */
export async function POST(req: NextRequest) {
  if (!ADMIN_API_KEY) return json(500, { error: "Missing ADMIN_API_KEY" });
  if (!requireAdmin(req)) return json(401, { error: "Unauthorized" });

  const supabase = getAdminSupabase();
  if (!supabase) return json(500, { error: "Server env missing" });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").trim().toLowerCase();
  const pairCode = String(body?.pair_code ?? "").trim();

  if (!pairCode) return json(400, { error: "Missing pair_code" });
  if (action !== "approve" && action !== "revoke") {
    return json(400, { error: "Invalid action (use approve or revoke)" });
  }

  // Load the device row
  const { data: device, error: dErr } = await (supabase as any)
    .from("devices")
    .select("id,pair_code,status,device_token,licensee_id,active")
    .eq("pair_code", pairCode)
    .maybeSingle();

  if (dErr) return json(500, { error: dErr.message });
  if (!device) return json(404, { error: "Device not found for that pair_code" });

  if (action === "approve") {
    const deviceToken =
      device.device_token ||
      crypto.randomBytes(24).toString("hex"); // generates a stable token

    const { data: updated, error: uErr } = await (supabase as any)
      .from("devices")
      .update({
        status: "active",
        active: true,
        device_token: deviceToken,
        approved_at: new Date().toISOString(),
      })
      .eq("id", device.id)
      .select("id,pair_code,status,device_token,licensee_id,approved_at,active")
      .maybeSingle();

    if (uErr) return json(500, { error: uErr.message });
    return json(200, { ok: true, device: updated });
  }

  // revoke
  const { data: revoked, error: rErr } = await (supabase as any)
    .from("devices")
    .update({
      status: "revoked",
      active: false,
    })
    .eq("id", device.id)
    .select("id,pair_code,status,device_token,licensee_id,active")
    .maybeSingle();

  if (rErr) return json(500, { error: rErr.message });
  return json(200, { ok: true, device: revoked });
}

// Safety: if your frontend is using PATCH or PUT, forward it to POST (prevents 405)
export async function PATCH(req: NextRequest) {
  return POST(req);
}
export async function PUT(req: NextRequest) {
  return POST(req);
}
