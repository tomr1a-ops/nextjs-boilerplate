import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getAdminSupabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function roomCandidates(room: string) {
  const trimmed = room.trim();
  const lower = trimmed.toLowerCase();
  const upper = trimmed.toUpperCase();
  return Array.from(new Set([trimmed, lower, upper])).filter(Boolean);
}

async function getLicenseeForRoom(supabase: any, room: string): Promise<{ id: string; pin: string | null } | null> {
  const candidates = roomCandidates(room);

  const { data: roomData } = await supabase
    .from("licensee_rooms")
    .select("licensee_id")
    .in("room_id", candidates)
    .maybeSingle();

  if (roomData?.licensee_id) {
    const { data: ld } = await supabase
      .from("licensees")
      .select("id, pin")
      .eq("id", roomData.licensee_id)
      .maybeSingle();
    return ld || null;
  }

  const { data: licenseeData } = await supabase
    .from("licensees")
    .select("id, pin")
    .in("code", candidates)
    .maybeSingle();

  if (licenseeData) return licenseeData;

  // Final fallback: many environments assign licensee on devices, not licensee_rooms.
  const { data: deviceData } = await supabase
    .from("devices")
    .select("licensee_id,last_seen")
    .in("room_id", candidates)
    .not("licensee_id", "is", null)
    .order("last_seen", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!deviceData?.licensee_id) return null;

  const { data: mappedLicensee } = await supabase
    .from("licensees")
    .select("id,pin")
    .eq("id", deviceData.licensee_id)
    .maybeSingle();

  return mappedLicensee || null;
}

async function isLicenseeActive(supabase: any, licenseeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("licensees")
    .select("active")
    .eq("id", licenseeId)
    .maybeSingle();
  if (error) return false;
  return data?.active !== false;
}

export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const room = req.nextUrl.searchParams.get("room")?.trim();
  if (!room) {
    return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
  }

  const pin = req.nextUrl.searchParams.get("pin");

  try {
    const licensee = await getLicenseeForRoom(supabase, room);
    if (!licensee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional PIN validation: only enforce when a PIN is provided by client.
    if (pin && licensee.pin && licensee.pin !== pin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const active = await isLicenseeActive(supabase, licensee.id);
    if (!active) {
      return NextResponse.json({ error: "License inactive" }, { status: 403 });
    }

    const { data: allowedLabels, error: labelsError } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", licensee.id);

    if (labelsError) {
      return NextResponse.json({ error: labelsError.message }, { status: 500 });
    }

    const labels = (allowedLabels || [])
      .map((x: any) => String(x.video_label || "").trim().toUpperCase())
      .filter(Boolean);
    if (labels.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select("id, label, playback_id, sort_order, active, created_at")
      .in("label", labels)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (videosError) {
      return NextResponse.json({ error: videosError.message }, { status: 500 });
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
