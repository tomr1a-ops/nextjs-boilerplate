import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { playbackId } = await req.json();

  if (!playbackId) {
    return new Response("Missing playbackId", { status: 400 });
  }

  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const privateKeyRaw = process.env.MUX_SIGNING_KEY_PRIVATE_KEY;

  if (!keyId || !privateKeyRaw) {
    return new Response("Missing Mux signing env vars", { status: 500 });
  }

  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  const exp = Math.floor(Date.now() / 1000) + 60 * 10;

  const token = jwt.sign(
    { sub: playbackId, aud: "v", exp },
    privateKey,
    { algorithm: "RS256", keyid: keyId }
  );

  return Response.json({ token });
}
