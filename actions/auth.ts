"use server";

import { redirect } from "next/navigation";
import { createAdminAuthClient } from "@/lib/supabase/auth-server";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createAdminAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("อีเมลหรือรหัสผ่านไม่ถูกต้อง")}`);
  }

  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createAdminAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
