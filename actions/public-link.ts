"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase/server";

// Client clicked "ยอมรับเงื่อนไข" on /p/[token] — record acceptance with
// IP + timestamp on the link row (the agreed design: T&C gate per link,
// no password).
export async function acceptProjectLinkTC(formData: FormData) {
  const token = String(formData.get("token"));

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const { error } = await supabase
    .from("project_links")
    .update({
      tc_accepted: true,
      tc_accepted_at: new Date().toISOString(),
      tc_accepted_ip: ip,
    })
    .eq("token", token)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  revalidatePath(`/p/${token}`);
}
