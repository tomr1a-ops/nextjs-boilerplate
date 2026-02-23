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
  if (!url || !key) throw new Error("Server env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/admin/licensees/[id]/videos
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const { id: licenseeId } = await context.params;

    const { data, error } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", licenseeId);

    if (error) return json(500, { error: error.message });

    const labels = (data || []).map((row: any) => row.video_label);
    return json(200, { video_labels: labels });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PUT /api/admin/licensees/[id]/videos
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const { id: licenseeId } = await context.params;
    const body = await req.json().catch(() => ({}));

    const videoLabels = Array.isArray(body.video_labels) ? body.video_labels : [];

    // Delete all existing assignments for this licensee
    const { error: deleteError } = await supabase
      .from("licensee_video_access")
      .delete()
      .eq("licensee_id", licenseeId);

    if (deleteError) return json(500, { error: deleteError.message });

    // Insert new assignments
    if (videoLabels.length > 0) {
      const inserts = videoLabels.map((label: string) => ({
        licensee_id: licenseeId,
        video_label: label,
      }));

      const { error: insertError } = await supabase
        .from("licensee_video_access")
        .insert(inserts);

      if (insertError) return json(500, { error: insertError.message });
    }

    return json(200, { ok: true, video_labels: videoLabels });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
