import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const { state, video_id, started_at } = body;

  const { error } = await supabase
    .from("room_sessions")
    .update({
      state,
      video_id,
      started_at,
    })
    .eq("room_id", "studioA");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
