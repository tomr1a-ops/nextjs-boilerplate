import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// If controller sometimes posts a label like "AL1V1", translate it to mux playback_id
async function normalizePlaybackId(supabase: any, playbackOrLabel: string | null) {
  if (!playbackOrLabel) return null;

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

async function getLicenseeIdForRoom(supabase: any, room: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("licensee_rooms")
    .select("licensee_id")
    .eq("room_id", room)
    .maybeSingle();

  if (error) return null;
  return (data?.licensee_id ?? null) as string | null;
}

async function isPlaybackAllowedForRoom(
  supabase: any,
  room: string,
  playbackId: string | null
): Promise<boolean> {
  if (!playbackId) return true; // stopping is always allowed

  const licenseeId = await getLicenseeIdForRoom(supabase, room);
  if (!licenseeId) return false;

  // Get allowed labels
  const { data: allowed, error: aErr } = await supabase
    .from("licensee_video_access")
    .select("video_label")
    .eq("licensee_id", licenseeId)
  

  if (aErr) return false;

  const labels = (allowed ?? [])
    .map((x: any) => (x?.video_label ?? "").toString().trim())
    .filter(Boolean);

  if (labels.length === 0) return false;

  // Resolve allowed labels -> playback_ids
  const { data: vids, error: vErr } = await supabase
    .from("videos")
    .select("playback_id")
    .in("label", labels)
    .eq("active", true);

  if (vErr) return false;

  const allowedPlayback = new Set(
    (vids ?? [])
      .map((x: any) => (x?.playback_id ?? "").toString().trim())
      .filter(Boolean)
  );

  return allowedPlayback.has(playbackId);
}

export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("room_sessions")
    .select("*")
    .eq("room_id", room)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: created, error: createErr } = await (supabase as any)
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
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // Two modes:
  // A) state/playback update
  // B) command: { command: "seek_delta", value: +10|-10 }
  const command = body?.command as string | undefined;

  // Ensure row exists
  const { data: existing, error: readErr } = await (supabase as any)
    .from("room_sessions")
    .select("*")
    .eq("room_id", room)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (!existing) {
    const { error: createErr } = await (supabase as any).from("room_sessions").insert({
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
      return NextResponse.json({ error: "Invalid seek_delta value" }, { status: 400 });
    }

    const { data: cur, error: curErr } = await (supabase as any)
      .from("room_sessions")
      .select("command_id")
      .eq("room_id", room)
      .single();

    if (curErr) {
      return NextResponse.json({ error: curErr.message }, { status: 500 });
    }

    const nextId = Number(cur.command_id || 0) + 1;

    const { error: updErr } = await (supabase as any)
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

  // Normal state update
  const state = body?.state as string | undefined;
  const playbackRaw = (body?.playback_id ?? body?.playback) as string | null | undefined;

  if (!state) {
    return NextResponse.json({ error: "Missing state (or command)" }, { status: 400 });
  }

  const playback_id = await normalizePlaybackId(supabase as any, playbackRaw ?? null);

  // ✅ ENFORCEMENT: block playing unlicensed content
  if (state !== "stopped") {
    const ok = await isPlaybackAllowedForRoom(supabase as any, room, playback_id);
    if (!ok) {
      return NextResponse.json(
        { error: "Video not allowed for this room/licensee" },
        { status: 403 }
      );
    }
  }

  const now = new Date().toISOString();

  const patch: Record<string, any> = {
    state,
    playback_id: playback_id ?? null,
    updated_at: now,
  };

  if (state === "playing") {
    patch.started_at = now;
    patch.paused_at = null;
  } else if (state === "paused") {
    patch.paused_at = now;
  } else if (state === "stopped") {
    patch.started_at = null;
    patch.paused_at = null;
    patch.seek_seconds = 0;
  }

  const { error: updErr } = await (supabase as any)
    .from("room_sessions")
    .update(patch)
    .eq("room_id", room);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
