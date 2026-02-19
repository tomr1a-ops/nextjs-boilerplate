import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RoomState = "playing" | "paused" | "stopped";

type SessionRow = {
  room_id: string;
  state: RoomState | null;
  playback_id: string | null;
  started_at: string | null;
  paused_at: string | null;
  seek_seconds: number | null;
  updated_at?: string | null;
};

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(v: unknown) {
  return (v ?? "").toString().trim();
}

function getRoomId(url: URL) {
  return clean(url.searchParams.get("room")) || "studioA";
}

/**
 * Lookup mux playback_id by human label (e.g. "AL1V1") from videos table.
 * videos: { label: text, playback_id: text, active: bool }
 */
async function lookupMuxPlaybackId(label: string): Promise<string | null> {
  const l = clean(label);
  if (!l) return null;

  const { data, error } = await supabase
    .from("videos")
    .select("playback_id")
    .eq("label", l)
    .eq("active", true)
    .single();

  if (error || !data?.playback_id) return null;
  return clean(data.playback_id) || null;
}

/**
 * Accept either a mux playback_id OR a label like "AL1V1"
 */
async function normalizePlaybackId(input: unknown): Promise<string | null> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  const fromDb = await lookupMuxPlaybackId(raw);
  if (fromDb) return fromDb;

  // assume already a mux playback id
  return raw;
}

async function readRoom(roomId: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from("room_sessions")
    .select("*")
    .eq("room_id", roomId)
    .single();

  if (error || !data) return null;
  return data as SessionRow;
}

// GET current room state
export async function GET(request: Request) {
  const roomId = getRoomId(new URL(request.url));
  const row = await readRoom(roomId);

  if (!row) {
    return NextResponse.json({ error: "room not found", room_id: roomId }, { status: 404 });
  }

  // Always return a predictable shape
  return NextResponse.json({
    room_id: row.room_id,
    state: row.state ?? "stopped",
    playback_id: row.playback_id ?? null,
    started_at: row.started_at ?? null,
    paused_at: row.paused_at ?? null,
    seek_seconds: row.seek_seconds ?? null,
    updated_at: row.updated_at ?? null,
  });
}

// POST controller command
export async function POST(request: Request) {
  const url = new URL(request.url);
  const roomId = getRoomId(url);

  const body = await request.json().catch(() => ({}));

  // New command contract
  const action = clean((body as any).action).toLowerCase(); // play | pause | stop | seek
  const video_id = (body as any).video_id ?? (body as any).playback_id ?? null;
  const seconds = Number((body as any).seconds);

  // Fetch current row so we can do safe transitions
  const current = await readRoom(roomId);
  if (!current) {
    return NextResponse.json({ error: "room not found", room_id: roomId }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  // Defaults: keep existing values unless action changes them
  let nextState: RoomState = (current.state ?? "stopped") as RoomState;
  let nextPlaybackId: string | null = current.playback_id ?? null;
  let started_at: string | null = current.started_at ?? null;
  let paused_at: string | null = current.paused_at ?? null;
  let seek_seconds: number | null = current.seek_seconds ?? null;

  if (action === "play") {
    const normalized = await normalizePlaybackId(video_id);
    if (!normalized) {
      return NextResponse.json(
        { error: "Missing or invalid video_id/playback_id", room_id: roomId },
        { status: 400 }
      );
    }
    nextState = "playing";
    nextPlaybackId = normalized;
    started_at = nowIso;
    paused_at = null;
    // when starting a video, clear seek unless explicitly provided
    seek_seconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : null;
  } else if (action === "pause") {
    // pausing requires there to be a video
    if (!nextPlaybackId) {
      return NextResponse.json({ error: "Nothing to pause", room_id: roomId }, { status: 400 });
    }
    nextState = "paused";
    paused_at = nowIso;
  } else if (action === "stop") {
    nextState = "stopped";
    nextPlaybackId = null;
    started_at = null;
    paused_at = null;
    seek_seconds = null;
  } else if (action === "seek") {
    // seek requires a video
    if (!nextPlaybackId) {
      return NextResponse.json({ error: "Nothing to seek", room_id: roomId }, { status: 400 });
    }
    if (!Number.isFinite(seconds)) {
      return NextResponse.json({ error: "Missing seconds", room_id: roomId }, { status: 400 });
    }
    seek_seconds = Math.max(0, Math.floor(seconds));
    // state unchanged
  } else {
    return NextResponse.json(
      { error: "Invalid action. Use play|pause|stop|seek", room_id: roomId },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("room_sessions")
    .update({
      state: nextState,
      playback_id: nextPlaybackId,
      started_at,
      paused_at,
      seek_seconds,
      updated_at: nowIso,
    })
    .eq("room_id", roomId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, room_id: roomId }, { status: 500 });
  }

  return NextResponse.json(data);
}
