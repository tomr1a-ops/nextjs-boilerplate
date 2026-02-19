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

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = clean(ctx.params.id);
  if (!licenseeId) return jsonError("Missing licensee id", 400);

  const { data, error } = await supabase
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
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = clean(ctx.params.id);
  const body = await req.json().catch(() => ({}));
  const roomId = clean(body?.room_id);

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!roomId) return jsonError("Missing room_id", 400);

  const { error } = await supabase
    .from("licensee_rooms")
    .insert({ licensee_id: licenseeId, room_id: roomId });

  if (error) return jsonError(error.message, 500);

  return new NextResponse(null, { status: 204 });
}

// Replace all rooms: { rooms: ["atlanta1","atlanta2"] }
export async function PUT(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = clean(ctx.params.id);
  const body = await req.json().catch(() => ({}));
  const rooms = Array.isArray(body?.rooms)
    ? body.rooms.map((x: any) => clean(x)).filter(Boolean)
    : null;

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!rooms) return jsonError("Missing rooms[]", 400);

  // clear existing
  const { error: delErr } = await supabase
    .from("licensee_rooms")
    .delete()
    .eq("licensee_id", licenseeId);

  if (delErr) return jsonError(delErr.message, 500);

  if (rooms.length === 0) return new NextResponse(null, { status: 204 });

  const rows = rooms.map((room_id: string) => ({
    licensee_id: licenseeId,
    room_id,
  }));

  const { error: insErr } = await supabase.from("licensee_rooms").insert(rows);
  if (insErr) return jsonError(insErr.message, 500);

  return new NextResponse(null, { status: 204 });
}

// Remove one room: ?room_id=atlanta1
export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = clean(ctx.params.id);
  const roomId = clean(req.nextUrl.searchParams.get("room_id"));

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!roomId) return jsonError("Missing room_id", 400);

  const { error } = await supabase
    .from("licensee_rooms")
    .delete()
    .eq("licensee_id", licenseeId)
    .eq("room_id", roomId);

  if (error) return jsonError(error.message, 500);

  return new NextResponse(null, { status: 204 });
}
