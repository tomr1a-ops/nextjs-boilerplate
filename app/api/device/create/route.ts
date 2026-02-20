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

function makePairingCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `IMA-${n}`;
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
  const room_id = clean((body as any).room_id) || "studioA";
  const name = clean((body as any).name) || room_id;

  // Generate a unique pairing code
  let pairing_code = "";
  for (let i = 0; i < 10; i++) {
    const candidate = makePairingCode();
    const { data } = await (supabase as any)
      .from("devices")
      .select("id")
      .eq("pairing_code", candidate)
      .maybeSingle();

    if (!data) {
      pairing_code = candidate;
      break;
    }
  }

  if (!pairing_code) {
    return NextResponse.json(
      { error: "Could not generate unique pairing code" },
      { status: 500 }
    );
  }

  const device_token = makeToken();
  const nowIso = new Date().toISOString();

  /**
   * NOTE:
   * Your existing devices table has NOT NULL constraints on some legacy columns
   * like `action`, so we must provide real values (not null).
   */
  const { data, error } = await (supabase as any)
    .from("devices")
    .upsert(
      {
        name,
        room_id,
        pairing_code,
        device_token,
        is_paired: false,
        active: true,
        last_seen: null,

        // legacy columns (avoid NOT NULL violations)
        action: "idle",
        current_video: "",
        action_at: nowIso,
      },
      { onConflict: "room_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    room_id: data.room_id,
    name: data.name,
    pairing_code: data.pairing_code,
  });
}
