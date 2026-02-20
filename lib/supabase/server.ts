import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getCookieStore(): Promise<any> {
  const c: any = cookies();
  return c && typeof c.then === "function" ? await c : c;
}

export async function supabaseServerAnon() {
  const cookieStore = await getCookieStore();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }: any) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
