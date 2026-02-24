import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Get licensee ID from room code
async function getLicenseeIdForRoom(
  supabase: any,
  room: string
): Promise<string | null> {
  // Try licensee_rooms first
  const { data: roomData } = await supabase
    .from("licensee_rooms")
    .select("licensee_id")
    .eq("room_id", room)
    .maybeSingle();
  
  if (roomData?.licensee_id) return roomData.licensee_id;

  // Fallback: treat room as licensee code
  const { data: licenseeData } = await supabase
    .from("licensees")
    .select("id")
    .eq("code", room)
    .maybeSingle();

  return licenseeData?.id || null;
}

// Check if licensee is active
async function isLicenseeActive(
  supabase: any,
  licenseeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("licensees")
    .select("active")
    .eq("id", licenseeId)
    .maybeSingle();

  if (error) return false;
  return data?.active !== false;
}

// GET /api/videos?room=AT100
export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    );
  }

  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
  }

  // Convert to uppercase to match licensee codes (AT100, not at100)
    const roomUpper = room;
  try {
    // Get licensee ID
    const licenseeId = await getLicenseeIdForRoom(supabase, roomUpper);
    if (!licenseeId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if licensee is active
    const active = await isLicenseeActive(supabase, licenseeId);
    if (!active) {
      return NextResponse.json(
        { error: "License inactive" },
        { status: 403 }
      );
    }

    // Get allowed video labels for this licensee
    const { data: allowedLabels, error: labelsError } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", licenseeId);

    if (labelsError) {
      return NextResponse.json(
        { error: labelsError.message },
        { status: 500 }
      );
    }

    const labels = (allowedLabels || [])
      .map((x: any) => x.video_label)
      .filter(Boolean);

    if (labels.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Get video details for allowed labels
    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select("id, label, playback_id, sort_order, active, created_at")
      .in("label", labels)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (videosError) {
      return NextResponse.json(
        { error: videosError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
