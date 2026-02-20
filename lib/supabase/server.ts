import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServerAnon() {
  // Next 16: cookies() may be Promise-wrapped in some contexts
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return (cookieStore as any).getAll?.() ?? [];
      },
      setAll(cookiesToSet) {
        // In Server Components this can be effectively read-only; don't crash the app
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            (cookieStore as any).set?.(name, value, options);
          });
        } catch {
          // no-op
        }
      },
    },
  });
}
