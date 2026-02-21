import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "invite" | "magiclink" | etc.
  const next = url.searchParams.get("next") || "/admin/users";

  // If we don't have the params, send them to login
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    // Supabase expects a specific union type. We'll cast safely.
    type: type as any,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  // Session cookies are now set by supabaseServer() cookie adapter.
  return NextResponse.redirect(new URL(next, url.origin));
}
