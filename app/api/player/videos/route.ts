import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getServiceSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * GET /api/player/videos?code=LICENSEE_CODE
 * Returns: only videos assigned to that licensee (and active=true)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    if (!supabase) {
      return jsonError(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get("code") || "").trim();

    if (!code) return jsonError("Missing code", 400);

    // Find licensee by code
    const licRes = await supabase
      .from("licensees")
      .select("id,code,active")
      .eq("code", code)
      .maybeSingle();

    if (licRes.error) return jsonError(licRes.error.message, 500);
    const licensee = licRes.data;
    if (!licensee || licensee.active === false) {
      return jsonError("Invalid or inactive licensee", 403);
    }

    // Load assigned videos via join table
    const lvRes = await supabase
      .from("licensee_videos")
      .select(
        "video:videos(id,title,slug,mux_playback_id,active,created_at)"
      )
      .eq("licensee_id", licensee.id)
      .eq("allowed", true);

    if (lvRes.error) return jsonError(lvRes.error.message, 500);

    const videosRaw = (lvRes.data || [])
      .map((r: any) => r.video)
      .filter(Boolean);

    // Only active videos
    const videos = videosRaw.filter((v: any) => v.active !== false);

    return NextResponse.json({ code: licensee.code, videos });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
