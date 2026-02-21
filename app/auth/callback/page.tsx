import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams?: {
    code?: string;
    next?: string;
  };
};

export default async function AuthCallbackPage({ searchParams }: Props) {
  const code = searchParams?.code || "";
  const next = searchParams?.next || "/set-password";

  // If Supabase didn't provide a code, bail to login
  if (!code) {
    redirect(`/login?error=${encodeURIComponent("Missing auth code")}`);
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Session is now set in cookies by your server client
  redirect(next);
}
