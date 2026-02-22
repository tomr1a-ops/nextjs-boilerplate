import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// GET /api/player/videos?code=AT100
export async function GET(req: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return json(500, { error: "Server env missing" });

  const codeRaw = req.nextUrl.searchParams.get("code") || "";
  const code = codeRaw.trim().toUpperCase();
  if (!code) return json(400, { error: "Missing code" });

  // 1) Find licensee by code + check active
  const { data: licensee, error: lErr } = await (supabase as any)
    .from("licensees")
    .select("id, name, code, active, created_at")
    .eq("code", code)
    .maybeSingle();

  if (lErr) return json(500, { error: lErr.message });
  if (!licensee) return json(404, { error: "Licensee not found" });

  // ✅ BLOCK if inactive
  if (licensee.active === false) {
    return json(403, { error: "License inactive" });
  }

  // 2) Get allowed labels for this licensee
  const { data: allowed, error: aErr } = await (supabase as any)
    .from("licensee_video_access")
    .select("video_label")
    .eq("licensee_id", licensee.id);

  if (aErr) return json(500, { error: aErr.message });

  const labels = (allowed ?? [])
    .map((x: any) => String(x?.video_label ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (labels.length === 0) {
    return json(200, { licensee, videos: [] });
  }

  // 3) Load active videos matching those labels
  const { data: videos, error: vErr } = await (supabase as any)
    .from("videos")
    .select("id, label, playback_id, sort_order, active, created_at")
    .in("label", labels)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (vErr) return json(500, { error: vErr.message });

  return json(200, { licensee, videos: videos ?? [] });
}
