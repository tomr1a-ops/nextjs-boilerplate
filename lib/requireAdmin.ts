import { NextRequest, NextResponse } from "next/server";

export function requireAdminKey(req: NextRequest) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return NextResponse.json(
      { error: "Missing ADMIN_API_KEY in env vars" },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get("x-admin-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // authorized
}
