import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function clean(input: string) {
  return (input || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

type VideoOut = {
  label: string;
  title?: string | null;
  url?: string | null;
  playback_id?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  id?: string;
  created_at?: string;
};

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const roomRaw = searchParams.get("room") || "";
    const room = clean(roomRaw);

    if (!room) {
      return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1) room -> licensee_id
    const { data: roomRow, error: roomErr } = await supabase
      .from("licensee_rooms")
      .select("licensee_id, room_id")
      .eq("room_id", room)
      .maybeSingle();

    if (roomErr) {
      return NextResponse.json({ error: roomErr.message }, { status: 500 });
    }

    if (!roomRow?.licensee_id) {
      return NextResponse.json(
        { build: "videos-v3-no-status", room, videos: [] as VideoOut[] },
        { status: 200 }
      );
    }

    const licenseeId = roomRow.licensee_id;

    // 2) licensee -> allowed labels
    const { data: accessRows, error: accessErr } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", licenseeId);

    if (accessErr) {
      return NextResponse.json({ error: accessErr.message }, { status: 500 });
    }

    const labels = (accessRows || [])
      .map((r: any) => r.video_label as string)
      .filter(Boolean);

    if (labels.length === 0) {
      return NextResponse.json(
        { build: "videos-v3-no-status", room, videos: [] as VideoOut[] },
        { status: 200 }
      );
    }

    // 3) Pull master video metadata (include whatever columns you actually have)
    // Your current production response shows: id,label,playback_id,sort_order,active,created_at
    const { data: videoRows, error: videosErr } = await supabase
      .from("videos")
      .select("id,label,playback_id,sort_order,active,created_at")
      .in("label", labels)
      .order("sort_order", { ascending: true });

    // If metadata lookup fails, still return labels
    if (videosErr) {
      return NextResponse.json(
        {
          build: "videos-v3-no-status",
          room,
          videos: labels.sort().map((label) => ({ label } as VideoOut)),
          warning: videosErr.message,
        },
        { status: 200 }
      );
    }

    const allowedSet = new Set(labels);
    const rows = (videoRows || []).filter((v: any) => allowedSet.has(v.label));

    // Build output that can include label-only rows for missing metadata
    const out: VideoOut[] = rows.map((v: any) => ({
      id: v.id,
      label: v.label,
      playback_id: v.playback_id,
      sort_order: v.sort_order,
      active: v.active,
      created_at: v.created_at,
    }));

    const returnedSet = new Set(out.map((v) => v.label));
    for (const label of labels) {
      if (!returnedSet.has(label)) out.push({ label });
    }

    // Sort deterministically (prefer sort_order if present, else label)
    out.sort((a, b) => {
      const ao = a.sort_order ?? 999999;
      const bo = b.sort_order ?? 999999;
      if (ao !== bo) return ao - bo;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json(
      { build: "videos-v3-no-status", room, videos: out },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
