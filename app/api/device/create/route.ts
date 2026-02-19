import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const body = await request.json().catch(() => ({}));
  const room_id = clean((body as any).room_id) || "studioA";
  const name = clean((body as any).name) || room_id;

  let pairing_code = "";
  for (let i = 0; i < 10; i++) {
    const candidate = makePairingCode();
    const { data } = await supabase
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

  const { data, error } = await supabase
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
        action: null,
        current_video: null,
        action_at: null,
      },
      { onConflict: "room_id" }
    )
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
    name: data.name,
    pairing_code: data.pairing_code,
  });
}

