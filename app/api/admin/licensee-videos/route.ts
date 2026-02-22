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
 * GET /api/admin/licensees/videos?licensee_id=...
 * Returns:
 *  - all videos
 *  - assigned video_ids for that licensee
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminRole(req, ["super_admin", "admin"]);

    const supabase = getAdminSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const { searchParams } = new URL(req.url);
    const licenseeId = String(searchParams.get("licensee_id") || "").trim();
    if (!licenseeId) return jsonError("Missing licensee_id", 400);

    const [videosRes, assignedRes] = await Promise.all([
      supabase
        .from("videos")
        .select("id,title,slug,mux_playback_id,active,created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("licensee_videos")
        .select("video_id,allowed")
        .eq("licensee_id", licenseeId)
        .eq("allowed", true),
    ]);

    if (videosRes.error) return jsonError(videosRes.error.message, 500);
    if (assignedRes.error) return jsonError(assignedRes.error.message, 500);

    const assignedIds = (assignedRes.data || []).map((r: any) => r.video_id);

    return NextResponse.json({
      videos: videosRes.data ?? [],
      assigned_video_ids: assignedIds,
    });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}

/**
 * POST /api/admin/licensees/videos
 * Body: { licensee_id: string, video_ids: string[] }
 * Behavior: replaces assignments (simple + predictable)
 */
export async function POST(req: NextRequest) {
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
    const licenseeId = String(body.licensee_id || "").trim();
    const videoIds = Array.isArray(body.video_ids) ? body.video_ids : [];

    if (!licenseeId) return jsonError("Missing licensee_id", 400);

    // 1) delete existing
    const del = await supabase
      .from("licensee_videos")
      .delete()
      .eq("licensee_id", licenseeId);

    if (del.error) return jsonError(del.error.message, 500);

    // 2) insert new
    if (videoIds.length > 0) {
      const rows = videoIds.map((video_id: string) => ({
        licensee_id: licenseeId,
        video_id,
        allowed: true,
      }));

      const ins = await supabase.from("licensee_videos").insert(rows);
      if (ins.error) return jsonError(ins.error.message, 500);
    }

    return NextResponse.json({ ok: true, licensee_id: licenseeId, count: videoIds.length });
  } catch (e: any) {
    if (e instanceof Response) return e as any;
    return jsonError(e?.message || "Server error", 500);
  }
}
