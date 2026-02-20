import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function clean(v: unknown) {
  return (v ?? "").toString().trim();
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const pairing_code = clean((body as any).pairing_code);
  const device_id = clean((body as any).device_id);

  if (!pairing_code || !device_id) {
    return NextResponse.json(
      { error: "Missing pairing_code or device_id" },
      { status: 400 }
    );
  }

  const { data: deviceRow, error: findErr } = await (supabase as any)
    .from("devices")
    .select("*")
    .eq("pairing_code", pairing_code)
    .eq("active", true)
    .single();

  if (findErr || !deviceRow) {
    return NextResponse.json(
      { error: "Invalid pairing code" },
      { status: 400 }
    );
  }

  const newToken = makeToken();

  const { data, error } = await (supabase as any)
    .from("devices")
    .update({
      device_id,
      device_token: newToken,
      is_paired: true,
      last_seen: new Date().toISOString(),
    })
    .eq("id", deviceRow.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    room_id: data.room_id,
    device_token: data.device_token,
  });
}
