import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function requireAdmin(req: NextRequest) {
  const key = (req.headers.get("x-admin-key") || "").trim();
  return key && ADMIN_API_KEY && key === ADMIN_API_KEY;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function getAdminSupabase():
  | { ok: true; supabase: ReturnType<typeof createClient> }
  | { ok: false; error: string } {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error:
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  return { ok: true, supabase: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) };
}

// Next.js sometimes types params as Promise<...> depending on version/tooling.
// This helper supports both.
async function getLicenseeId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const obj = p && typeof p.then === "function" ? await p : p;
  return clean(obj?.id);
}

export async function GET(req: NextRequest, ctx: any) {
  if (!ADMIN_API_KEY) return jsonError("Missing ADMIN_API_KEY", 500);
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const admin = getAdminSupabase();
  if (!admin.ok) return jsonError(admin.error, 500);
  const supabase = admin.supabase;

  const licenseeId = await getLicenseeId(ctx);
  if (!licenseeId) return jsonError("Missing licensee id", 400);

  const { data, error } = await (supabase as any)
    .from("licensee_rooms")
    .select("room_id,created_at")
    .eq("licensee_id", licenseeId)
    .order("room_id", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    licensee_id: licenseeId,
    rooms: (data ?? []).map((r: any) => r.room_id),
  });
}

// Add one room: { room_id: "atlanta1" }
export async function POST(req: NextRequest, ctx: any) {
  if (!ADMIN_API_KEY) return jsonError("Missing ADMIN_API_KEY", 500);
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const admin = getAdminSupabase();
  if (!admin.ok) return jsonError(admin.error, 500);
  const supabase = admin.supabase;

  const licenseeId = await getLicenseeId(ctx);
  const body = await req.json().catch(() => ({}));
  const roomId = clean(body?.room_id);

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!roomId) return jsonError("Missing room_id", 400);

  const { error } = await (supabase as any)
    .from("licensee_rooms")
    .insert({ licensee_id: licenseeId, room_id: roomId });

  if (error) return jsonError(error.message, 500);

  return new NextResponse(null, { status: 204 });
}

// Replace all rooms: { rooms: ["atlanta1","atlanta2"] }
export async function PUT(req: NextRequest, ctx: any) {
  if (!ADMIN_API_KEY) return jsonError("Missing ADMIN_API_KEY", 500);
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const admin = getAdminSupabase();
  if (!admin.ok) return jsonError(admin.error, 500);
  const supabase = admin.supabase;

  const licenseeId = await getLicenseeId(ctx);
  const body = await req.json().catch(() => ({}));
  const rooms = Array.isArray(body?.rooms) ? body.rooms : [];

  if (!licenseeId) return jsonError("Missing licensee id", 400);

  // delete existing
  const { error: delErr } = await (supabase as any)
    .from("licensee_rooms")
    .delete()
    .eq("licensee_id", licenseeId);

  if (delErr) return jsonError(delErr.message, 500);

  // insert new
  const cleaned = rooms.map((r: any) => clean(r)).filter(Boolean);
  if (cleaned.length > 0) {
    const rows = cleaned.map((room_id: string) => ({ licensee_id: licenseeId, room_id }));
    const { error: insErr } = await (supabase as any).from("licensee_rooms").insert(rows);
    if (insErr) return jsonError(insErr.message, 500);
  }

  return new NextResponse(null, { status: 204 });
}
