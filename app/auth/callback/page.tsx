import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthCallbackPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const next =
    typeof searchParams?.next === "string" && searchParams.next
      ? searchParams.next
      : "/admin";

  // Intentionally no getSessionFromUrl() (not available in your supabase-js)
  redirect(next);
}
