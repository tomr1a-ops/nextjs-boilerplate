import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function requireAdminRole(
  req: NextRequest,
  allowed: string[] = ["super_admin", "admin"]
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !anon || !service) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { error: "Missing Supabase env vars (URL, ANON, or SERVICE ROLE)" },
        { status: 500 }
      ),
    };
  }

  // 1) Identify the currently logged-in user via cookies (anon key)
  const authRes = NextResponse.next();

  const supabaseAuth = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          authRes.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // 2) Look up admin role using service role (never blocked by RLS)
  const supabaseService = createClient(url, service, {
    auth: { persistSession: false },
  });

  const { data: row, error: roleErr } = await supabaseService
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { error: `Admin role lookup failed: ${roleErr.message}` },
        { status: 500 }
      ),
    };
  }

  const role = (row?.role || "").toString();
  const active = row?.active !== false;

  if (!active || !role || !allowed.includes(role)) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
    role,
    authRes, // (optional) has any cookie updates
  };
}
