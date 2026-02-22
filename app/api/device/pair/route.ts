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

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

function makeToken() {
  // simple, good-enough random token for device auth
  return (
    "dev_" +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

// POST /api/device/pair
// body: { licensee_code, pair_code }
export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const licensee_code = String(body?.licensee_code || "").trim().toUpperCase();
    const pair_code = String(body?.pair_code || "").trim();

    if (!licensee_code || !pair_code) {
      return json(400, { error: "Missing licensee_code or pair_code" });
    }

    // Licensee must exist and be active
    const { data: lic, error: licErr } = await supabase
      .from("licensees")
      .select("id, active, status")
      .eq("code", licensee_code)
      .maybeSingle();

    if (licErr) return json(500, { error: licErr.message });
    if (!lic) return json(404, { error: "Licensee code not found" });

    // allow either boolean active or status text
    const licActive =
      (typeof lic.active === "boolean" ? lic.active : true) &&
      (typeof lic.status === "string" ? lic.status.toLowerCase() !== "inactive" : true);

    if (!licActive) return json(403, { error: "License inactive" });

    // find or create device row for this pair_code
    const { data: existing, error: exErr } = await supabase
      .from("devices_v2")
      .select("*")
      .eq("pair_code", pair_code)
      .maybeSingle();

    if (exErr) return json(500, { error: exErr.message });

    if (!existing) {
      // create as pending
      const { data: created, error: cErr } = await supabase
        .from("devices_v2")
        .insert([
          {
            pair_code,
            licensee_id: lic.id,
            status: "pending",
            active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select("*")
        .single();

      if (cErr) return json(500, { error: cErr.message });

      return json(200, {
        status: "pending",
        message: "Device request created. Awaiting admin approval.",
      });
    }

    // if pair_code exists but belongs to different licensee, block it
    if (existing.licensee_id && existing.licensee_id !== lic.id) {
      return json(403, { error: "Pair code belongs to a different licensee" });
    }

    // If revoked/inactive
    if (existing.active === false || String(existing.status || "").toLowerCase() === "revoked") {
      return json(403, { error: "Device access revoked" });
    }

    // If already active and token exists, return it so the device can start immediately
    if (String(existing.status || "").toLowerCase() === "active" && existing.device_token) {
      return json(200, { status: "active", device_token: existing.device_token });
    }

    // still pending
    return json(200, { status: "pending", message: "Awaiting admin approval." });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// GET /api/device/pair?pair_code=XXXX
// lets the device poll until approved
export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const pair_code = String(url.searchParams.get("pair_code") || "").trim();
    if (!pair_code) return json(400, { error: "Missing pair_code" });

    const { data, error } = await supabase
      .from("devices_v2")
      .select("status, device_token, active")
      .eq("pair_code", pair_code)
      .maybeSingle();

    if (error) return json(500, { error: error.message });
    if (!data) return json(404, { error: "Pair code not found" });

    if (data.active === false || String(data.status || "").toLowerCase() === "revoked") {
      return json(403, { error: "Device access revoked" });
    }

    if (String(data.status || "").toLowerCase() === "active" && data.device_token) {
      return json(200, { status: "active", device_token: data.device_token });
    }

    return json(200, { status: "pending" });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
