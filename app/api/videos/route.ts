import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRole } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdminRole(req, ["super_admin", "admin"]);
  if (!gate.ok) return gate.res;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  // Change "videos" + columns to match your schema.
  // Common columns: id, label, title, sort_order, created_at
  const { data, error } = await supabase
    .from("videos")
    .select("id,label,title,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] }, { status: 200 });
}
