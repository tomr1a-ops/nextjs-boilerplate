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
  if (!url || !key) throw new Error("Server env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/admin/videos - List all videos
export async function GET(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("videos")
      .select("id, label, playback_id, sort_order, active, created_at")
      .order("sort_order", { ascending: true });

    if (error) return json(500, { error: error.message });
    return json(200, { videos: data || [] });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// POST /api/admin/videos - Create new video
export async function POST(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const label = String(body?.label || "").trim().toUpperCase();
    const playback_id = String(body?.playback_id || "").trim();

    if (!label) return json(400, { error: "Missing label" });
    if (!playback_id) return json(400, { error: "Missing playback_id" });

    // Get next sort_order
    const { data: existing } = await supabase
      .from("videos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existing && existing.length > 0 
      ? (existing[0].sort_order || 0) + 1 
      : 1;

    const { data, error } = await supabase
      .from("videos")
      .insert([{
        label,
        playback_id,
        sort_order: nextSortOrder,
        active: true,
      }])
      .select("id, label, playback_id, sort_order, active, created_at")
      .single();

    if (error) return json(500, { error: error.message });
    return json(200, { video: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// DELETE /api/admin/videos?id=UUID
export async function DELETE(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "").trim();
    
    if (!id) return json(400, { error: "Missing id" });

    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) return json(500, { error: error.message });

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}

// PATCH /api/admin/videos?id=UUID - Update video
export async function PATCH(req: Request) {
  const auth = requireAdminKey(req);
  if (!auth.ok) return json(401, { error: auth.error });

  try {
    const supabase = supabaseAdmin();
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return json(400, { error: "Missing id" });

    const updateData: any = {};
    
    if (body.label !== undefined) updateData.label = String(body.label).trim().toUpperCase();
    if (body.sort_order !== undefined) updateData.sort_order = Number(body.sort_order);
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    if (Object.keys(updateData).length === 0) {
      return json(400, { error: "No fields to update" });
    }

    const { data, error } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", id)
      .select("id, label, playback_id, sort_order, active, created_at")
      .single();

    if (error) return json(500, { error: error.message });
    return json(200, { video: data });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
}
