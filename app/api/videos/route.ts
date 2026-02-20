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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const room = (url.searchParams.get("room") || "").trim();

    // If room is provided, enforce license filtering:
    // room -> licensee_rooms -> licensee_id -> licensee_video_access -> allowed labels
    let allowedLabels: string[] | null = null;

    if (room) {
      const { data: roomRow, error: roomErr } = await supabase
        .from("licensee_rooms")
        .select("licensee_id, status")
        .eq("room_id", room)
        .maybeSingle();

      // If no room mapping, return empty list (acts like "no license")
      if (roomErr) {
        return NextResponse.json({ error: roomErr.message }, { status: 500 });
      }
      if (!roomRow) {
        return NextResponse.json({ videos: [] }, { status: 200 });
      }

      // Optional: if you store status on licensee_rooms
      if (roomRow.status && roomRow.status !== "active") {
        return NextResponse.json({ videos: [] }, { status: 200 });
      }

      const { data: accessRows, error: accessErr } = await supabase
        .from("licensee_video_access")
        .select("video_label, status")
        .eq("licensee_id", roomRow.licensee_id);

      if (accessErr) {
        return NextResponse.json({ error: accessErr.message }, { status: 500 });
      }

      allowedLabels =
        (accessRows || [])
          .filter((r: any) => !r.status || r.status === "active")
          .map((r: any) => String(r.video_label || "").trim())
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
      // If license exists but no labels, return none
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
