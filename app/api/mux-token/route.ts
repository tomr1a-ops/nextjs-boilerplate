import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function buildToken(playbackId: string) {
  const keyId = getEnv("MUX_SIGNING_KEY_ID");
  const privateKey = getEnv("MUX_SIGNING_KEY_PRIVATE_KEY").replace(/\\n/g, "\n");

  const token = jwt.sign(
    { sub: playbackId, aud: "v" },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "1h",
      header: { kid: keyId },
    }
  );

  return token;
}

// ✅ GET /api/mux-token?playbackId=XXXX
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playbackId = searchParams.get("playbackId");
    if (!playbackId) {
      return NextResponse.json({ error: "Missing playbackId" }, { status: 400 });
    }
    return NextResponse.json({ token: buildToken(playbackId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
