import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export function mergeResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c);
  });
  return to;
}

/**
 * Cookie-based admin gate:
 * - Uses anon key + cookies to identify the logged-in user
 * - Then uses SERVICE ROLE to read admin_users (bypasses RLS safely on server)
 *
 * Returns { user, role, res } or THROWS a NextResponse JSON error.
 */
export async function requireAdminRole(
  req: NextRequest,
  allowed: string[] = ["super_admin", "admin"]
): Promise<{ user: User; role: string; res: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !anon) {
    throw NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }
  if (!service) {
    throw NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  // This response collects any refreshed auth cookies (if Supabase rotates them)
  const res = NextResponse.next();

  // 1) Identify logged-in user via cookies (anon client)
  const supabaseAuth = createServerClient(url, anon, {
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

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Check admin role using SERVICE ROLE (server-only; bypasses RLS)
  const admin = createServerClient(url, service, {
    cookies: {
      getAll() {
        return []; // no cookies needed for service role
      },
      setAll() {
        // no-op
      },
    },
  });

  const { data: row, error: roleErr } = await admin
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
