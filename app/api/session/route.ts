import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(v: unknown) {
  return (v ?? "").toString().trim();
}

function getRoomId(url: URL) {
  return (url.searchParams.get("room") || "studioA").trim() || "studioA";
}

async function lookupMuxPlaybackId(label: string): Promise<string | null> {
  const c = clean(label);
  if (!c) return null;

  const { data, error } = await supabase
    .from("videos")
    .select("playback_id")
    .eq("label", c)
    .eq("active", true)
    .single();

  if (error || !data?.playback_id) return null;
  return String(data.playback_id).trim() || null;
}

async function normalizePlaybackId(input: unknown): Promise<string | null> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  const fromDb = await lookupMuxPlaybackId(raw);
  if (fromDb) return fromDb;

  return raw; // assume already mux playback id
}

// GET current room state
export async function GET(request: Request) {
  const roomId = getRoomId(new URL(request.url));

  const { data, error } = await supabase
    .from("room_sessions")
    .select("*")
    .eq("room_id", roomId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, room_id: roomId }, { status: 500 });
  }

  return NextResponse.json(data);
}

// UPDATE room state
export async function POST(request: Request) {
  const url = new URL(request.url);
  const roomId = getRoomId(url);

  const body = await request.json().catch(() => ({}));
  const {
    state,
    playback_id,
    video_id,
    started_at,
    paused_at,
    seek_seconds,
  } = body as {
    state?: string | null;
    playback_id?: string | null;
    video_id?: string | null;
    started_at?: string | null;
    paused_at?: string | null;
    seek_seconds?: number | null; // NEW
  };

  const normalized = await normalizePlaybackId(playback_id ?? video_id);

  // Require valid id when playing/paused
  if ((state === "playing" || state === "paused") && !normalized) {
    return NextResponse.json(
      { error: "Missing or invalid playback_id/video_id", room_id: roomId },
      { status: 400 }
    );
  }

  const updatePayload: any = {
    state: state ?? null,
    playback_id: normalized,
    started_at: started_at ?? null,
    paused_at: paused_at ?? null,
  };

  // Only update seek_seconds if provided
  if (typeof seek_seconds === "number" && Number.isFinite(seek_seconds)) {
    updatePayload.seek_seconds = Math.trunc(seek_seconds);
  }

  const { data, error } = await supabase
    .from("room_sessions")
    .update(updatePayload)
    .eq("room_id", roomId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, room_id: roomId }, { status: 500 });
  }

  return NextResponse.json(data);
}
