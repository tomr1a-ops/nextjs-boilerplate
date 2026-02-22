import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

// GET /api/videos?room=atlanta1
export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return json(500, { error: "Server env missing" });

  const roomRaw = req.nextUrl.searchParams.get("room") || "";
  const room = roomRaw.trim().toLowerCase();
  if (!room) return json(400, { error: "Missing room" });

  // 1) map room -> licensee_id
  const { data: lr, error: lrErr } = await (supabase as any)
    .from("licensee_rooms")
    .select("licensee_id")
    .eq("room_id", room)
    .maybeSingle();

  if (lrErr) return json(500, { error: lrErr.message });
  if (!lr?.licensee_id) return json(404, { error: "Room not found" });

  // 2) check licensee active
  const { data: lic, error: licErr } = await (supabase as any)
    .from("licensees")
    .select("id, active")
    .eq("id", lr.licensee_id)
    .maybeSingle();

  if (licErr) return json(500, { error: licErr.message });
  if (!lic) return json(404, { error: "Licensee not found for room" });

  // ✅ BLOCK if inactive
  if (lic.active === false) {
    return json(403, { error: "License inactive" });
  }

  // 3) allowed labels
  const { data: allowed, error: aErr } = await (supabase as any)
    .from("licensee_video_access")
    .select("video_label")
    .eq("licensee_id", lic.id);

  if (aErr) return json(500, { error: aErr.message });

  const labels = (allowed ?? [])
    .map((x: any) => String(x?.video_label ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (labels.length === 0) return json(200, { videos: [] });

  // 4) fetch active videos
  const { data: videos, error: vErr } = await (supabase as any)
    .from("videos")
    .select("id, label, playback_id, sort_order, active, created_at")
    .in("label", labels)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (vErr) return json(500, { error: vErr.message });

  return json(200, { videos: videos ?? [] });
}
