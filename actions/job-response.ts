"use server";

import { revalidatePath } from "next/cache";
import { verifyJobToken } from "@/lib/auth/talent-session";
import { supabase } from "@/lib/supabase/server";

// talent เปิด /job/[token] แล้วกด รับงาน/ปฏิเสธ — auth ด้วย job token
// (JWT อายุ 14 วัน scoped ต่อ project_talents แถวเดียว)
export async function respondToJob(formData: FormData) {
  const token = String(formData.get("token"));
  const response = String(formData.get("response"));
  if (response !== "accepted" && response !== "declined") return;

  const verified = await verifyJobToken(token);
  if (!verified) return;

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id")
    .eq("id", verified.projectTalentId)
    .maybeSingle();
  if (!pt) return;

  const { error } = await supabase
    .from("project_talents")
    .update({ talent_response: response })
    .eq("id", pt.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/job/${token}`);
  revalidatePath(`/admin/projects/${pt.project_id}`);
}
