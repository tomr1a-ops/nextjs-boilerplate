import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAdminSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    // must be logged in AND be in admin_users
    await requireAdminRole(req);

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
  } catch (err: any) {
    // if requireAdminRole threw a NextResponse, return it
    if (err instanceof NextResponse) return err;
    return jsonError(err?.message || "Server error", 500);
  }
}
