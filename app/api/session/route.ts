import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-side Supabase client (uses service role key — keep this ONLY on server)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch label -> mux playback_id from Supabase table: public.videos
 * Expected columns: label (text), playback_id (text), active (bool)
 */
async function lookupMuxPlaybackId(label: string): Promise<string | null> {
  const clean = (label ?? "").toString().trim();
  if (!clean) return null;

  const { data, error } = await supabase
    .from("videos")
    .select("playback_id")
    .eq("label", clean)
    .eq("active", true)
    .single();

  if (error || !data?.playback_id) return null;
  return (data.playback_id ?? "").toString().trim() || null;
}

/**
 * If input is a label (AL1V1...), translate via Supabase.
 * If it's already a mux playback id, return as-is.
 */
async function normalizePlaybackId(input: unknown): Promise<string | null> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  // If it looks like a label (e.g., AL1V1), prefer DB lookup
  // (Also works even if someone passes a mux id: lookup will just fail and we fall back)
  const fromDb = await lookupMuxPlaybackId(raw);
  if (fromDb) return fromDb;

  // Not a known label in DB; assume caller passed a real mux playback id already
  return raw;
}

function getRoomId(url: URL) {
  return (url.searchParams.get("room") || "studioA").trim() || "studioA";
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
    return NextResponse.json(
      { error: error.message, room_id: roomId },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// UPDATE room state
export async function POST(request: Request) {
  const url = new URL(request.url);
  const roomId = getRoomId(url);

  const body = await request.json().catch(() => ({}));
  const { state, playback_id, video_id, started_at, paused_at } = body as {
    state?: string | null;
    playback_id?: string | null;
    video_id?: string | null;
    started_at?: string | null;
    paused_at?: string | null;
  };

  const normalized = await normalizePlaybackId(playback_id ?? video_id);

  // If they're trying to play something, require a valid normalized id
  if ((state === "playing" || state === "paused") && !normalized) {
    return NextResponse.json(
      { error: "Missing or invalid playback_id/video_id", room_id: roomId },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("room_sessions")
    .update({
      state: state ?? null,
      playback_id: normalized,
      started_at: started_at ?? null,
      paused_at: paused_at ?? null,
    })
    .eq("room_id", roomId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, room_id: roomId },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
