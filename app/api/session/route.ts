import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
export const revalidate = 0;


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET current room state
export async function GET() {
  const { data, error } = await supabase
    .from("room_sessions")
    .select("*")
    .eq("room_id", "studioA")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// UPDATE room state
export async function POST(request: Request) {
  const body = await request.json();

  // Accept either "playback_id" (preferred) or legacy "video_id"
  const {
    state,
    playback_id,
    video_id,
    started_at,
    paused_at,
  } = body;

  const { data, error } = await supabase
    .from("room_sessions")
    .update({
      state,
      playback_id: playback_id ?? video_id ?? null,
      started_at: started_at ?? null,
      paused_at: paused_at ?? null,
    })
    .eq("room_id", "studioA")
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

