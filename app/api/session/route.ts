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

// If controller sometimes posts a label like "AL1V1", translate it to mux playback_id
async function normalizePlaybackId(playbackOrLabel: string | null) {
  if (!playbackOrLabel) return null;

  // Mux playback ids are typically alphanumeric; labels like AL1V1 are short and usually contain letters+digits.
  // We’ll do a lookup if it looks like a label (you can tighten this rule).
  const looksLikeLabel = playbackOrLabel.length <= 16;

  if (!looksLikeLabel) return playbackOrLabel;

  const { data, error } = await supabase
    .from("videos")
    .select("playback_id")
    .eq("label", playbackOrLabel)
    .eq("active", true)
    .maybeSingle();

  if (error) return playbackOrLabel;
  return data?.playback_id || playbackOrLabel;
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("room_sessions")
    .select("*")
    .eq("room_id", room)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no row exists yet, create it
  if (!data) {
    const { data: created, error: createErr } = await supabase
      .from("room_sessions")
      .insert({
        room_id: room,
        state: "stopped",
        playback_id: null,
        started_at: null,
        paused_at: null,
        seek_seconds: 0,
        command_id: 0,
        command_type: null,
        command_value: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // Two modes:
  // A) state/playback update: { state: "playing"|"paused"|"stopped", playback_id: "...or label..." }
  // B) command: { command: "seek_delta", value: +10|-10 }
  const command = body?.command as string | undefined;

  // Ensure row exists
  const { data: existing, error: readErr } = await supabase
    .from("room_sessions")
    .select("*")
    .eq("room_id", room)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (!existing) {
    const { error: createErr } = await supabase.from("room_sessions").insert({
      room_id: room,
      state: "stopped",
      playback_id: null,
      started_at: null,
      paused_at: null,
      seek_seconds: 0,
      command_id: 0,
      command_type: null,
      command_value: null,
      updated_at: new Date().toISOString(),
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
  }

  // Handle seek command
  if (command === "seek_delta") {
    const value = Number(body?.value);
    if (!Number.isFinite(value) || value === 0) {
      return NextResponse.json(
        { error: "Invalid seek_delta value" },
        { status: 400 }
      );
    }

    // Increment command_id atomically-ish:
    // read current, then update +1. (For your single-controller use this is fine; we can harden later if needed.)
    const { data: cur, error: curErr } = await supabase
      .from("room_sessions")
      .select("command_id")
      .eq("room_id", room)
      .single();

    if (curErr) {
      return NextResponse.json({ error: curErr.message }, { status: 500 });
    }

    const nextId = Number(cur.command_id || 0) + 1;

    const { error: updErr } = await supabase
      .from("room_sessions")
      .update({
        command_id: nextId,
        command_type: "seek_delta",
        command_value: value,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", room);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  }

  // Handle normal state update
  const state = body?.state as string | undefined;
  const playbackRaw = (body?.playback_id ?? body?.playback) as
    | string
    | null
    | undefined;

  if (!state) {
    return NextResponse.json(
      { error: "Missing state (or command)" },
      { status: 400 }
    );
  }

  const playback_id = await normalizePlaybackId(playbackRaw ?? null);

  const now = new Date().toISOString();

  const patch: Record<string, any> = {
    state,
    playback_id: state === "stopped" ? null : playback_id,
    updated_at: now,
  };

  if (state === "playing") patch.started_at = now;
  if (state === "paused") patch.paused_at = now;
  if (state === "stopped") {
    patch.started_at = null;
    patch.paused_at = null;
  }

  const { error: updErr } = await supabase
    .from("room_sessions")
    .update(patch)
    .eq("room_id", room);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
