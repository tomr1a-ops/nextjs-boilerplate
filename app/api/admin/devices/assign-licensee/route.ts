import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
  );
}
if (!ADMIN_API_KEY) throw new Error("Missing ADMIN_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function requireAdmin(req: NextRequest) {
  const key = (req.headers.get("x-admin-key") || "").trim();
  return key && key === ADMIN_API_KEY;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clean(v: any) {
  return (v ?? "").toString().trim();
}

/**
 * Body:
 * {
 *   "device_token": "...",
 *   "licensee_id": "...uuid...",
 *   "room_id": "atlanta1" // optional
 * }
 */
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const deviceToken = clean(body?.device_token);
  const licenseeId = clean(body?.licensee_id);
  const roomId = body?.room_id !== undefined ? clean(body?.room_id) : undefined;

  if (!deviceToken) return jsonError("Missing device_token", 400);
  if (!licenseeId) return jsonError("Missing licensee_id", 400);

  const patch: Record<string, any> = {
    licensee_id: licenseeId,
  };
  if (roomId !== undefined) patch.room_id = roomId;

  const { data, error } = await supabase
    .from("devices")
    .update(patch)
    .eq("device_token", deviceToken)
    .select("room_id,name,pairing_code,device_token,last_seen,active,licensee_id")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Device not found for that device_token", 404);

  return NextResponse.json({ device: data });
}
