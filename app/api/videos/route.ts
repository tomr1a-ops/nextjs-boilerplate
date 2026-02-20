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

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = clean(url.searchParams.get("search"));
    const room = clean(url.searchParams.get("room"));

    let allowedLabels: string[] | null = null;

    if (room) {
      const { data: roomRows, error: roomErr } = await supabase
        .from("licensee_rooms")
        .select("licensee_id, room_id")
        .eq("room_id", room);

      if (roomErr) {
        return NextResponse.json(
          { build: "videos-v3-no-status", error: roomErr.message },
          { status: 500 }
        );
      }

      if (!roomRows || roomRows.length === 0) {
        return NextResponse.json(
          { build: "videos-v3-no-status", videos: [] },
          { status: 200 }
        );
      }

      if (roomRows.length > 1) {
        return NextResponse.json(
          {
            build: "videos-v3-no-status",
            error: "Room is assigned to multiple licensees (room_id must be unique).",
            room_id: room,
            matches: roomRows.map((r: any) => ({ licensee_id: r.licensee_id })),
          },
          { status: 409 }
        );
      }

      const licenseeId = roomRows[0].licensee_id;

      const { data: accessRows, error: accessErr } = await supabase
        .from("licensee_video_access")
        .select("video_label")
        .eq("licensee_id", licenseeId);

      if (accessErr) {
        return NextResponse.json(
          { build: "videos-v3-no-status", error: accessErr.message },
          { status: 500 }
        );
      }

      allowedLabels =
        (accessRows || [])
          .map((r: any) => clean(r?.video_label))
          .filter(Boolean) ?? [];
    }

    let q = supabase.from("videos").select("*").eq("active", true);

    if (search) {
      q = q.ilike("label", `%${search}%`);
    }

    if (allowedLabels) {
      if (allowedLabels.length === 0) {
        return NextResponse.json(
          { build: "videos-v3-no-status", videos: [] },
          { status: 200 }
        );
      }
      q = q.in("label", allowedLabels);
    }

    const { data, error } = await q.order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { build: "videos-v3-no-status", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { build: "videos-v3-no-status", videos: data ?? [] },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { build: "videos-v3-no-status", error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
