// app/api/mux-token/route.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const playbackId = req.nextUrl.searchParams.get("playbackId");
  if (!playbackId) {
    return new Response(JSON.stringify({ error: "Missing playbackId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const signingKeyId = process.env.MUX_SIGNING_KEY_ID;
  const signingKeySecret = process.env.MUX_SIGNING_KEY_SECRET;

  if (!signingKeyId || !signingKeySecret) {
    return new Response(
      JSON.stringify({
        error: "Missing env vars MUX_SIGNING_KEY_ID or MUX_SIGNING_KEY_SECRET",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const token = jwt.sign(
    {
      sub: playbackId,
      aud: "v",
      exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
    },
    signingKeySecret,
    {
      algorithm: "HS256",
      keyid: signingKeyId, // <-- THIS is critical for Mux (kid header)
    }
  );

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
