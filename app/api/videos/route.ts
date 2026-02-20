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

type VideoRow = {
  id: string;
  label: string;
  playback_id: string;
  sort_order: number | null;
  active: boolean;
  created_at?: string;
};

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = clean(url.searchParams.get("search"));
    const room = clean(url.searchParams.get("room"));

    // If room is provided, enforce license filtering:
    // room -> licensee_rooms -> licensee_id -> licensee_video_access -> allowed labels
    let allowedLabels: string[] | null = null;

    if (room) {
      const { data: roomRows, error: roomErr } = await supabase
        .from("licensee_rooms")
        .select("licensee_id,status,room_id")
        .eq("room_id", room);

      if (roomErr) {
        return NextResponse.json({ error: roomErr.message }, { status: 500 });
      }

      if (!roomRows || roomRows.length === 0) {
        // no license mapping => no videos
        return NextResponse.json({ videos: [] }, { status: 200 });
      }

      // If multiple mappings exist for same room, that's a data integrity issue.
      // Try to pick exactly one active; if ambiguous, return 409.
      const activeRows = roomRows.filter(
        (r: any) => !r?.status || String(r.status) === "active"
      );

      if (activeRows.length === 0) {
        return NextResponse.json({ videos: [] }, { status: 200 });
      }

      if (activeRows.length > 1) {
        return NextResponse.json(
          {
            error:
              "Room is assigned to multiple active licensees. Fix licensee_rooms so room_id is unique.",
            room_id: room,
            matches: activeRows.map((r: any) => ({ licensee_id: r.licensee_id })),
          },
          { status: 409 }
        );
      }

      const licenseeId = activeRows[0].licensee_id;

      const { data: accessRows, error: accessErr } = await supabase
        .from("licensee_video_access")
        .select("video_label,status")
        .eq("licensee_id", licenseeId);

      if (accessErr) {
        return NextResponse.json({ error: accessErr.message }, { status: 500 });
      }

      allowedLabels =
        (accessRows || [])
          .filter((r: any) => !r?.status || String(r.status) === "active")
          .map((r: any) => clean(r?.video_label))
          .filter(Boolean) ?? [];
    }

    let q = supabase
      .from("videos")
      .select("id,label,playback_id,sort_order,active,created_at")
      .eq("active", true);

    if (search) {
      q = q.ilike("label", `%${search}%`);
    }

    if (allowedLabels) {
      if (allowedLabels.length === 0) {
        return NextResponse.json({ videos: [] }, { status: 200 });
      }
      q = q.in("label", allowedLabels);
    }

    const { data, error } = await q.order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: (data || []) as VideoRow[] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
