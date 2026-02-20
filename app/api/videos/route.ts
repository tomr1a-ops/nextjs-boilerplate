import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function clean(input: string) {
  return (input || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env vars missing" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roomRaw = searchParams.get("room") || "";
    const room = clean(roomRaw);

    if (!room) {
      return NextResponse.json(
        { error: "Missing room parameter" },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /**
     * Schema assumptions based on your handoff:
     * - licensee_rooms: room_id -> licensee_id
     * - licensee_video_access: (licensee_id, label) or similar
     * - videos: master list keyed by label
     *
     * We only need labels allowed for the licensee owning this room.
     */

    // 1) room -> licensee_id
    const { data: roomRow, error: roomErr } = await supabase
      .from("licensee_rooms")
      .select("licensee_id, room_id")
      .eq("room_id", room)
      .maybeSingle();

    if (roomErr) {
      return NextResponse.json(
        { error: roomErr.message },
        { status: 500 }
      );
    }

    if (!roomRow?.licensee_id) {
      return NextResponse.json(
        { build: "videos-v3-no-status", room, videos: [] },
        { status: 200 }
      );
    }

    const licenseeId = roomRow.licensee_id;

    // 2) licensee -> allowed labels
    const { data: accessRows, error: accessErr } = await supabase
      .from("licensee_video_access")
      .select("label")
      .eq("licensee_id", licenseeId);

    if (accessErr) {
      return NextResponse.json(
        { error: accessErr.message },
        { status: 500 }
      );
    }

    const labels = (accessRows || [])
      .map((r: any) => r.label)
      .filter(Boolean);

    if (labels.length === 0) {
      return NextResponse.json(
        { build: "videos-v3-no-status", room, videos: [] },
        { status: 200 }
      );
    }

    // 3) label -> video metadata (optional)
    // If your `videos` table has more fields, include them here.
    const { data: videoRows, error: videosErr } = await supabase
      .from("videos")
      .select("label, title, url")
      .in("label", labels)
      .order("label", { ascending: true });

    if (videosErr) {
      // even if videos lookup fails, return at least labels
      return NextResponse.json(
        {
          build: "videos-v3-no-status",
          room,
          videos: labels.sort().map((label) => ({ label })),
          warning: videosErr.message,
        },
        { status: 200 }
      );
    }

    // Ensure only allowed labels get returned even if videos table contains extras
    const allowedSet = new Set(labels);
    const videos = (videoRows || []).filter((v: any) => allowedSet.has(v.label));

    // If videos table is missing some labels, preserve them as label-only rows
    const returnedSet = new Set(videos.map((v: any) => v.label));
    for (const label of labels) {
      if (!returnedSet.has(label)) videos.push({ label });
    }

    videos.sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));

    return NextResponse.json(
      { build: "videos-v3-no-status", room, videos },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
