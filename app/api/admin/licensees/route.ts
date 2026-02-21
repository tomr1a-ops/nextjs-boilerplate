import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { requireAdminRole, mergeResponseCookies } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { res: authRes } = await requireAdminRole(req);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const out = NextResponse.next();

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            out.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase
      .from("licensees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return mergeResponseCookies(
        out,
        mergeResponseCookies(
          authRes,
          NextResponse.json({ error: error.message }, { status: 500 })
        )
      );
    }

    return mergeResponseCookies(
      out,
      mergeResponseCookies(
        authRes,
        NextResponse.json({ licensees: data ?? [] }, { status: 200 })
      )
    );
  } catch (e: any) {
    if (e instanceof Response) return e;

    return NextResponse.json(
      { error: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
