import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServerAnon() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        // Next 16 cookies() is async; after await, getAll exists
        return (cookieStore as any).getAll();
      },
      setAll(cookiesToSet) {
        // In some Next contexts cookies are "readonly" by type; runtime supports set in route handlers/server actions
        cookiesToSet.forEach(({ name, value, options }) => {
          (cookieStore as any).set(name, value, options);
        });
      },
    },
  });
}
