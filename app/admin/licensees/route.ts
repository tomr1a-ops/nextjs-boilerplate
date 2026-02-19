import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
  );
}
if (!ADMIN_API_KEY) {
  throw new Error("Missing ADMIN_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function requireAdmin(req: NextRequest) {
  const key = (req.headers.get("x-admin-key") || "").trim();
  return key && key === ADMIN_API_KEY;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clean(v: any) {
  return (v ?? "").toString().trim();
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const status = clean(req.nextUrl.searchParams.get("status")); // optional: active/disabled
  const search = clean(req.nextUrl.searchParams.get("search")); // optional: matches name/code

  let q = supabase
    .from("licensees")
    .select("id,name,code,status,created_at")
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (search) {
    // OR search on name/code
    q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ licensees: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const name = clean(body?.name);
  const code = clean(body?.code).toUpperCase();
  const status = clean(body?.status) || "active";

  if (!name) return jsonError("Missing name", 400);
  if (!code) return jsonError("Missing code", 400);
  if (!["active", "disabled"].includes(status))
    return jsonError("Invalid status (active|disabled)", 400);

  const { data, error } = await supabase
    .from("licensees")
    .insert({ name, code, status })
    .select("id,name,code,status,created_at")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ licensee: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const id = clean(body?.id);
  if (!id) return jsonError("Missing id", 400);

  const patch: Record<string, any> = {};

  if (body?.name !== undefined) {
    const name = clean(body?.name);
    if (!name) return jsonError("Invalid name", 400);
    patch.name = name;
  }

  if (body?.code !== undefined) {
    const code = clean(body?.code).toUpperCase();
    if (!code) return jsonError("Invalid code", 400);
    patch.code = code;
  }

  if (body?.status !== undefined) {
    const status = clean(body?.status);
    if (!["active", "disabled"].includes(status))
      return jsonError("Invalid status (active|disabled)", 400);
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const { data, error } = await supabase
    .from("licensees")
    .update(patch)
    .eq("id", id)
    .select("id,name,code,status,created_at")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ licensee: data });
}
