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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").trim().toUpperCase();

    if (!code) return json(400, { error: "Missing code" });

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Server env missing" });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Find licensee by code
    const { data: lic, error: licErr } = await supabase
      .from("licensees")
      .select("id, name, code")
      .eq("code", code)
      .maybeSingle();

    if (licErr) return json(500, { error: licErr.message });
    if (!lic) return json(404, { error: "Invalid code" });

    // 2) Get allowed labels for this licensee
    const { data: accessRows, error: accessErr } = await supabase
      .from("licensee_video_access")
      .select("video_label")
      .eq("licensee_id", lic.id);

    if (accessErr) return json(500, { error: accessErr.message });

    const labels = (accessRows || [])
      .map((r: any) => String(r.video_label || "").trim().toUpperCase())
      .filter(Boolean);

    if (labels.length === 0) {
      return json(200, { licensee: lic, videos: [] });
    }

    // 3) Fetch videos that match those labels
    const { data: vids, error: vidsErr } = await supabase
      .from("videos")
      .select("id, label, playback_id, sort_order, active, created_at")
      .in("label", labels)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (vidsErr) return json(500, { error: vidsErr.message });

    // Keep only allowed labels (and preserve label filtering)
    const allowedSet = new Set(labels);
    const filtered = (vids || []).filter((v: any) => allowedSet.has(String(v.label || "").toUpperCase()));

    return json(200, { licensee: lic, videos: filtered });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
