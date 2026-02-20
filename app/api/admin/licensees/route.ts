import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function mergeResponseCookies(from: NextResponse, to: NextResponse) {
  // Copy any cookies set on `from` to `to`
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c);
  });
  return to;
}

export async function requireAdminRole(
  req: NextRequest,
  allowed: string[] = ["super_admin", "admin"]
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: roleErr } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr) {
    throw NextResponse.json(
      { error: `Admin role lookup failed: ${roleErr.message}` },
      { status: 500 }
    );
  }

  const role = (row?.role || "").toString();
  const active = row?.active !== false;

  if (!active || !role || !allowed.includes(role)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user, role, res };
}
