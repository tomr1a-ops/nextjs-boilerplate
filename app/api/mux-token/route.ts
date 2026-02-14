import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Support both GET (browser) and POST (app/fetch)
export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

function handle(req: Request) {
  const url = new URL(req.url);
  const playbackId = url.searchParams.get("playbackId") || url.searchParams.get("id");

  if (!playbackId) {
    return NextResponse.json(
      { error: "Missing playbackId in query string (use ?playbackId=...)" },
      { status: 400 }
    );
  }

  const keyId = process.env.MUX_SIGNING_KEY_ID;
  let privateKey = process.env.MUX_SIGNING_KEY_PRIVATE_KEY;

  if (!keyId) {
    return NextResponse.json({ error: "Missing env var: MUX_SIGNING_KEY_ID" }, { status: 500 });
  }
  if (!privateKey) {
    return NextResponse.json(
      { error: "Missing env var: MUX_SIGNING_KEY_PRIVATE_KEY" },
      { status: 500 }
    );
  }

  // In case Vercel stored it with literal "\n"
  privateKey = privateKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60; // 60 seconds

  const token = jwt.sign(
    { sub: playbackId, aud: "v", exp },
    privateKey,
    { algorithm: "RS256", keyid: keyId }
  );

  return NextResponse.json({ token });
}
