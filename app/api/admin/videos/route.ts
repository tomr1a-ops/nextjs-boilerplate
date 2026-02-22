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

export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin();

    const deviceToken = (req.headers.get("x-device-token") || "").trim();
    if (!deviceToken) {
      return json(401, { error: "Device not paired. Missing device token." });
    }

    // Find device
    const { data: dev, error: dErr } = await supabase
      .from("devices_v2")
      .select("id, licensee_id, status, active")
      .eq("device_token", deviceToken)
      .maybeSingle();

    if (dErr) return json(500, { error: dErr.message });
    if (!dev) return json(401, { error: "Invalid device token" });

    if (dev.active === false || String(dev.status || "").toLowerCase() !== "active") {
      return json(403, { error: "Device not active" });
    }

    if (!dev.licensee_id) return json(403, { error: "Device not linked to a licensee" });

    // Licensee must be active
    const { data: lic, error: lErr } = await supabase
      .from("licensees")
      .select("id, name, code, active, status")
      .eq("id", dev.licensee_id)
      .maybeSingle();

    if (lErr) return json(500, { error: lErr.message });
    if (!lic) return json(403, { error: "Licensee not found" });

    const licActive =
      (typeof lic.active === "boolean" ? lic.active : true) &&
      (typeof lic.status === "string" ? lic.status.toLowerCase() !== "inactive" : true);

    if (!licActive) return json(403, { error: "License inactive" });

    // What videos are allowed for this licensee?
    const { data: allowed, error: aErr } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", lic.id);

    if (aErr) return json(500, { error: aErr.message });

    const labels = (allowed || [])
      .map((x: any) => String(x?.video_label || "").trim())
      .filter(Boolean);

    if (labels.length === 0) return json(200, { licensee: lic, videos: [] });

    const { data: vids, error: vErr } = await supabase
      .from("videos")
      .select("id, label, playback_id, sort_order, active, created_at")
      .in("label", labels)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (vErr) return json(500, { error: vErr.message });

    // touch last_seen
    await supabase
      .from("devices_v2")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", dev.id);

    return json(200, { licensee: lic, videos: vids || [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
