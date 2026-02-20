import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function requireAdmin(req: NextRequest) {
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
  const key = (req.headers.get("x-admin-key") || "").trim();
  return ADMIN_API_KEY && key && key === ADMIN_API_KEY;
}

function getAdminSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return jsonError("Unauthorized", 401);

  const supabase = getAdminSupabase();
  if (!supabase) {
    return jsonError(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
      500
    );
  }

  const { data, error } = await supabase
    .from("videos")
    .select("id,label,playback_id,sort_order,active,created_at")
    .order("sort_order", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ videos: data ?? [] });
}
