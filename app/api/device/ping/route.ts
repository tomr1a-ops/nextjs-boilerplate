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

/**
 * POST body:
 * {
 *   device_token: "bbac3e...",
 * }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const device_token = clean((body as any).device_token);

  if (!device_token) {
    return NextResponse.json({ error: "Missing device_token" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("devices")
    .update({ last_seen: nowIso })
    .eq("device_token", device_token)
    .eq("active", true)
    .select("room_id,last_seen")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid device_token" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, room_id: data.room_id, last_seen: data.last_seen });
}

