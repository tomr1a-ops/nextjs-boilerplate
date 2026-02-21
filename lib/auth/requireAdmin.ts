import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export async function requireAdminRole(
  req: NextRequest,
  allowed: string[] = ["super_admin", "admin"]
): Promise<{ user: User; role: string; res: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = NextResponse.next();

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

  const { data: userData } = await supabaseAuth.auth.getUser();
  const user = userData?.user;

  if (!user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServerClient(url, service, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });

  const { data: row, error } = await admin
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw NextResponse.json(
      { error: `Admin role lookup failed: ${error.message}` },
      { status: 500 }
    );
  }

  const role = row?.role;
  const active = row?.active !== false;

  if (!role || !active || !allowed.includes(role)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user, role, res };
}
