import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function requireAdminKey(req: Request) {
  const got = req.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return { ok: false, error: "Server missing ADMIN_API_KEY" };
  if (!got || got !== expected) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

function makeToken() {
  return (
    "dev_" +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

// GET /api/admin/devices
export async function GET(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("devices_v2")
      .select("id, pair_code, status, active, device_token, licensee_id, created_at, approved_at, last_seen_at")
      .order("created_at", { ascending: false });

    if (error) return json(500, { error: error.message });
    return json(200, { devices: data || [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PATCH /api/admin/devices
// body: { id, action: "approve" | "revoke" }
export async function PATCH(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "").trim().toLowerCase();

    if (!id) return json(400, { error: "Missing id" });
    if (!["approve", "revoke"].includes(action)) {
      return json(400, { error: "Invalid action" });
    }

    if (action === "approve") {
      const token = makeToken();
      const { data, error } = await supabase
        .from("devices_v2")
        .update({
          status: "active",
          active: true,
          approved_at: new Date().toISOString(),
          device_token: token,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      return json(200, { device: data });
    }

    // revoke
    const { data, error } = await supabase
      .from("devices_v2")
      .update({
        status: "revoked",
        active: false,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return json(500, { error: error.message });
    return json(200, { device: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
