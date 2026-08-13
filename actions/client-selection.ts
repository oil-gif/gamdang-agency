"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { notifyCasting } from "@/lib/admin-notify";
import { SITE_URL } from "@/lib/site";

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
    .select("id, project_id, client_interested, talent:talents(nickname_th, nickname_en, code)")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt || pt.project_id !== link.project_id) return;

  const nowInterested = !pt.client_interested;
  const { error } = await supabase
    .from("project_talents")
    .update({ client_interested: nowInterested })
    .eq("id", pt.id);
  if (error) throw new Error(error.message);

  // แจ้งกลุ่มทีมงานทันทีที่ลูกค้า "กดเลือก" — เดิมไม่มีอะไรบอกเลย ต้องเปิด
  // หลังบ้านเช็คเอง กว่าจะรู้ก็ช้า · แจ้งเฉพาะตอนกดเลือก ไม่แจ้งตอนกดยกเลิก
  // (ลูกค้ากดสลับไปมาระหว่างเลือก กลุ่มจะเด้งรัว)
  if (nowInterested) {
    const talent = pt.talent as unknown as {
      nickname_th: string | null;
      nickname_en: string | null;
      code: string | null;
    } | null;
    const { data: project } = await supabase
      .from("projects")
      .select("name, client_name")
      .eq("id", pt.project_id)
      .maybeSingle();
    const who =
      talent?.nickname_en || talent?.nickname_th || talent?.code || "(ไม่มีชื่อ)";
    // แจ้งเตือนล้มเหลวห้ามทำให้ลูกค้ากดปุ่มไม่ได้
    try {
      await notifyCasting(
        [
          "⭐ ลูกค้ากดเลือกทาเลนต์แล้ว!",
          `งาน: ${project?.name ?? "-"}`,
          project?.client_name ? `ลูกค้า: ${project.client_name}` : "",
          `เลือก: ${who}${talent?.code ? ` (${talent.code})` : ""}`,
          "",
          `ดูรายชื่อที่ลูกค้าเลือก: ${SITE_URL}/admin/projects/${pt.project_id}`,
        ].filter(Boolean),
      );
    } catch {
      // เงียบไว้ — สถานะบันทึกลง DB เรียบร้อยแล้ว
    }
  }

  revalidatePath(`/p/${token}`);
  revalidatePath(`/admin/projects/${pt.project_id}`);
}
