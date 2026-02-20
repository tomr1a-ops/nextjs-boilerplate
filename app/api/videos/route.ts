import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const room = req.nextUrl.searchParams.get("room")?.trim() || "";

  // Base query for active videos
  // NOTE: videos table: id, label, playback_id, sort_order, active, created_at
  // If room is supplied, we filter to allowed labels for that room's licensee.
  if (room) {
    // 1) Find licensee_id for this room
    const { data: lr, error: lrErr } = await supabase
      .from("licensee_rooms")
      .select("licensee_id")
      .eq("room_id", room)
      .maybeSingle();

    if (lrErr) {
      return NextResponse.json({ error: lrErr.message }, { status: 500 });
    }

    if (!lr?.licensee_id) {
      // If room not registered to a licensee yet, return empty
      return NextResponse.json({ videos: [] });
    }

    // 2) Get allowed labels for that licensee
    const { data: allowed, error: aErr } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", lr.licensee_id)
      .eq("status", "active");

    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

    const labels = (allowed ?? [])
      .map((x: any) => (x?.video_label ?? "").toString().trim())
      .filter(Boolean);

    if (labels.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // 3) Pull videos that match those labels (and optional search)
    let q = supabase
      .from("videos")
      .select("id,label,playback_id,sort_order,active")
      .eq("active", true)
      .in("label", labels)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (search) {
      q = q.ilike("label", `%${search}%`);
    }

    const { data: vids, error: vErr } = await q;

    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    return NextResponse.json({ videos: vids ?? [] });
  }

  // No room param: return full library (your current behavior)
  let q = supabase
    .from("videos")
    .select("id,label,playback_id,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (search) {
    q = q.ilike("label", `%${search}%`);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}
