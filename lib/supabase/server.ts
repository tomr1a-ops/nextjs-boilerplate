import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServerAnon() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return (cookieStore as any).getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          (cookieStore as any).set(name, value, options);
        });
      },
    },
  });
}
