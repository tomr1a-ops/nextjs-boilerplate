import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(v: unknown) {
  return (v ?? "").toString().trim();
}

// GET /api/videos?search=AL1&category=warmup&active=1
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = clean(url.searchParams.get("search"));
  const category = clean(url.searchParams.get("category"));
  const active = clean(url.searchParams.get("active")) || "1";

  let q = supabase.from("videos").select("*").order("label", { ascending: true });

  if (active === "1") q = q.eq("active", true);
  if (category) q = q.eq("category", category);

  // Simple search: matches label OR title if you have it
  if (search) {
    // If your videos table doesn't have title, label match still works.
    q = q.or(`label.ilike.%${search}%,title.ilike.%${search}%`);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}

