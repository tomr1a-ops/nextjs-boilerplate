"use server";

import { redirect } from "next/navigation";
import { supabaseServerAnon } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const supabase = await supabaseServerAnon();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // bounce back with message
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await supabaseServerAnon();
  await supabase.auth.signOut();
  redirect("/login");
}
