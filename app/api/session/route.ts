import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map your short labels -> real Mux Playback IDs
const PLAYBACK_MAP: Record<string, string> = {
  AL1V1: "EEtT1vz9FZ01DpH4iyByDjwV5w102dhuVOo6EEp12eHMU",
  AL1V2: "e7X7EJp8Jahpq6flU02DnQwLFHO4TddylPRBu7K5Gbfc",
  AL1V3: "XuLHibjnFLc8qk9Igm9Hy9zdjWuxQkmWUYtnIj17mCE",
  AL1V4: "4qL5JKtULtosN2ZBIk6LeWOiTltq3MPN502EKyX5mxJk",
  AL1V5: "Cnk501oW00IqBMr4mAvMTbuVVCBBuSnPBZjZPcyvfnOKc",
  AL2V1: "K8gSatGtFiAFoHOX1y00UCBoJ7QAf62yLv47ssZ3EX00I",
  AL2V2: "1AdrfOytgHRI8Wz01YSe01FPLM4l7lPsz00frWqqFk4TP8",
  AL2V3: "FetjqAx46HX2N11C2MAxKs2n0116bzvJgWl62FceIJoE",
  AL2V4: "yxgsEPSAz60000OPuQUOB7RzQE277ckkVMq14cbfHU2sU",
  AL2V5: "vyYgEDdFFyugHokVXjoKxBvb2Sz7mxRVf66R6LtrXEA",
  AL3V1: "bDKMIv2brILRM019XxKPJoubPCcznJUIE19YxQUUsPmI",
  AL3V2: "bCUqBVSqt1gAVV02BgYUStXSC2V1Omce4cxUB8ijV8J8",
  AL3V3: "qH3sUQwV01g00fZrmCPE01wz00RjQ1UGJhnwmj8ARhQ3j7o",
  AL3V4: "ePFMYIR5bse5uoNszdbXtOKywa89pKtfv01jcq1PJwAk",
  AL3V5: "zorscGp9dOlOHdMpPoVf001hW6ByEVKJeTL00GIVPWFkQ",
};

function normalizePlaybackId(input: unknown): string | null {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;

  // If it's one of your short labels, return the real mux playback id
  if (PLAYBACK_MAP[raw]) return PLAYBACK_MAP[raw];

  // Otherwise assume it's already a real mux playback id (long base62-ish)
  return raw;
}

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

  const { state, playback_id, video_id, started_at, paused_at } = body;

  const normalized = normalizePlaybackId(playback_id ?? video_id);

  const { data, error } = await supabase
    .from("room_sessions")
    .update({
      state: state ?? null,
      playback_id: normalized,
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
