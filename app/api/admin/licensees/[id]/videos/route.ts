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

// Supports Next versions where params may be Promise-wrapped
async function getLicenseeId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const obj = p && typeof p.then === "function" ? await p : p;
  return clean(obj?.id);
}

export async function GET(req: NextRequest, ctx: any) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = await getLicenseeId(ctx);
  if (!licenseeId) return jsonError("Missing licensee id", 400);

  const { data, error } = await supabase
    .from("licensee_video_access")
    .select("video_label,created_at")
    .eq("licensee_id", licenseeId)
    .order("video_label", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    licensee_id: licenseeId,
    video_labels: (data ?? []).map((r: any) => r.video_label),
  });
}

// Add one label: { video_label: "A1V1" }
export async function POST(req: NextRequest, ctx: any) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = await getLicenseeId(ctx);
  const body = await req.json().catch(() => ({}));
  const videoLabel = clean(body?.video_label).toUpperCase();

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!videoLabel) return jsonError("Missing video_label", 400);

  const { error } = await supabase
    .from("licensee_video_access")
    .insert({ licensee_id: licenseeId, video_label: videoLabel });

  if (error) return jsonError(error.message, 500);

  return new NextResponse(null, { status: 204 });
}

// Replace all labels: { video_labels: ["A1V1","A1V2"] }
export async function PUT(req: NextRequest, ctx: any) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = await getLicenseeId(ctx);
  const body = await req.json().catch(() => ({}));
  const labels = Array.isArray(body?.video_labels)
    ? body.video_labels
        .map((x: any) => clean(x).toUpperCase())
        .filter(Boolean)
    : null;

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!labels) return jsonError("Missing video_labels[]", 400);

  const { error: delErr } = await supabase
    .from("licensee_video_access")
    .delete()
    .eq("licensee_id", licenseeId);

  if (delErr) return jsonError(delErr.message, 500);

  if (labels.length === 0) return new NextResponse(null, { status: 204 });

  const rows = labels.map((video_label: string) => ({
    licensee_id: licenseeId,
    video_label,
  }));

  const { error: insErr } = await supabase
    .from("licensee_video_access")
    .insert(rows);

  if (insErr) return jsonError(insErr.message, 500);

  return new NextResponse(null, { status: 204 });
}

// Remove one label: ?video_label=A1V1
export async function DELETE(req: NextRequest, ctx: any) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const licenseeId = await getLicenseeId(ctx);
  const videoLabel = clean(req.nextUrl.searchParams.get("video_label")).toUpperCase();

  if (!licenseeId) return jsonError("Missing licensee id", 400);
  if (!videoLabel) return jsonError("Missing video_label", 400);

  const { error } = await supabase
    .from("licensee_video_access")
    .delete()
    .eq("licensee_id", licenseeId)
    .eq("video_label", videoLabel);

  if (error) return jsonError(error.message, 500);

  return new NextResponse(null, { status: 204 });
}
