import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminKey } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authFail = requireAdminKey(req);
  if (authFail) return authFail;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !service) {
    return NextResponse.json(
      { error: "Missing Supabase server env vars" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, service, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("licensees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ licensees: data ?? [] }, { status: 200 });
}
