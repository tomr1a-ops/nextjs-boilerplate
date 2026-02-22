import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function safeUrl(u?: string | null) {
  if (!u) return null;
  // only return the hostname + project ref, not secrets
  try {
    const url = new URL(u);
    return url.origin; // e.g. https://whflzptysfatetcsmdsv.supabase.co
  } catch {
    return u;
  }
}

export async function GET() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json(
    {
      using_supabase_url: safeUrl(SUPABASE_URL),
      has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
