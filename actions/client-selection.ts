"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";

// ลูกค้ากดปุ่ม "สนใจ" บนการ์ดใน /p/[token] — toggle
// project_talents.client_interested แล้วแอดมินเห็นทันทีในหน้าโปรเจกต์.
// การ auth ของหน้านี้คือ token ลิงก์เอง ดังนั้นต้องตรวจว่า (1) ลิงก์ยังใช้ได้
// และผ่าน T&C แล้ว (2) แถวที่จะ toggle เป็นของโปรเจกต์ของลิงก์นั้นจริง
// กันคนเดา id ไป toggle ข้ามโปรเจกต์.
export async function toggleClientInterest(formData: FormData) {
  const token = String(formData.get("token"));
  const ptId = String(formData.get("pt_id"));
  if (!token || !ptId) return;

  const { data: link } = await supabase
    .from("project_links")
    .select("project_id, status, expires_at, tc_accepted")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.status !== "active" || !link.tc_accepted) return;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return;

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id, client_interested")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt || pt.project_id !== link.project_id) return;

  const { error } = await supabase
    .from("project_talents")
    .update({ client_interested: !pt.client_interested })
    .eq("id", pt.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/p/${token}`);
  revalidatePath(`/admin/projects/${pt.project_id}`);
}
