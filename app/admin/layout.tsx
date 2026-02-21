import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !anon || !service) {
    // If env vars missing, don't leak details; just bounce.
    redirect("/login");
  }

  // ✅ Next.js 16: cookies() is async
  const cookieStore = await cookies();

  // 1) Get logged-in user via cookies (anon key)
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op in a server layout
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    redirect("/login");
  }

  // 2) Check role via service role (bypasses RLS cleanly)
  const supabaseService = createClient(url, service, {
    auth: { persistSession: false },
  });

  const { data: row } = await supabaseService
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (row?.role || "").toString();
  const active = row?.active !== false;

  if (!active || !["super_admin", "admin"].includes(role)) {
    redirect("/login");
  }

  return <>{children}</>;
}
