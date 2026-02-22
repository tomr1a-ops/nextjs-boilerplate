import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * GET /api/admin/licensee-videos?licensee_id=UUID
 * returns: { video_ids: string[] }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminRole(req, ["super_admin", "admin", "staff"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const { searchParams } = new URL(req.url);
    const licensee_id = String(searchParams.get("licensee_id") || "").trim();

    if (!licensee_id) return jsonError("Missing licensee_id", 400);

    const { data, error } = await supabase
      .from("licensee_videos")
      .select("video_id")
      .eq("licensee_id", licensee_id);

    if (error) return jsonError(error.message, 500);

    const video_ids = (data ?? []).map((r: any) => r.video_id).filter(Boolean);
    return NextResponse.json({ video_ids });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}

/**
 * PUT /api/admin/licensee-videos
 * body: { licensee_id: string, video_ids: string[] }
 * Behavior: replaces existing assignments with provided list
 */
export async function PUT(req: NextRequest) {
  try {
    await requireAdminRole(req, ["super_admin", "admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const body = await req.json().catch(() => ({}));
    const licensee_id = String(body.licensee_id || "").trim();
    const video_ids = Array.isArray(body.video_ids) ? body.video_ids : [];

    if (!licensee_id) return jsonError("Missing licensee_id", 400);

    // 1) delete current rows
    const del = await supabase
      .from("licensee_videos")
      .delete()
      .eq("licensee_id", licensee_id);

    if (del.error) return jsonError(del.error.message, 500);

    // 2) insert new rows
    const rows = video_ids
      .map((id: any) => String(id || "").trim())
      .filter(Boolean)
      .map((video_id: string) => ({ licensee_id, video_id }));

    if (rows.length > 0) {
      const ins = await supabase.from("licensee_videos").insert(rows);
      if (ins.error) return jsonError(ins.error.message, 500);
    }

    return NextResponse.json({ ok: true, licensee_id, count: rows.length });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}
