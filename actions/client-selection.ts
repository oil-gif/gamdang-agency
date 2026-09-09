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

  // แจ้งกลุ่มทีมงานเมื่อลูกค้า "กดเลือก" — เดิมไม่มีอะไรบอกเลย ต้องเปิดหลังบ้าน
  // เช็คเอง กว่าจะรู้ก็ช้า · ไม่แจ้งตอนกดยกเลิก
  //
  // ⚠️ ของเดิมแจ้ง "1 ข้อความต่อ 1 คนที่กด" → ลูกค้ากดสลับเลือก/ยกเลิกไปมา
  // ระหว่างตัดสินใจ กลุ่มไลน์เด้งชื่อเดิมซ้ำๆ (เจอจริง Tony ZL767H 3 ครั้งใน
  // นาทีเดียว) และเปลืองโควตา LINE · ตอนนี้ **1 งานเด้งครั้งเดียวต่อรอบ**
  // แล้วเงียบไป 12 ชม. ถ้าลูกค้ากลับมาเลือกเพิ่มวันหลังถึงจะแจ้งใหม่
  // (พี่เจ้าของแจ้ง 2026-09-10)
  if (nowInterested) {
    await notifyClientSelection(pt.project_id);
  }

  revalidatePath(`/p/${token}`);
  revalidatePath(`/admin/projects/${pt.project_id}`);
}

// เว้นช่วงก่อนแจ้งซ้ำ — ลูกค้ามักนั่งเลือกรวดเดียวหลายคน ควรได้ข้อความเดียว
const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 ชม.

async function notifyClientSelection(projectId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_name, client_select_notified_at")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  // ยังไม่รัน migration 028 → ไม่มีคอลัมน์ ค่าจะเป็น undefined → ถือว่ายังไม่เคย
  // แจ้ง แล้วเขียนกลับไม่ได้ ก็จะกลับไปเป็นพฤติกรรมเดิม (แจ้งทุกครั้ง) ไม่พัง
  const last = (project as { client_select_notified_at?: string | null })
    .client_select_notified_at;
  if (last && Date.now() - new Date(last).getTime() < NOTIFY_COOLDOWN_MS) {
    return; // เพิ่งแจ้งไป — เงียบไว้ ไม่เด้งซ้ำ
  }

  // นับ "ตอนนี้ลูกค้าเลือกไว้กี่คน" แทนการบอกชื่อทีละคน
  const { count } = await supabase
    .from("project_talents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("client_interested", true);

  try {
    await notifyCasting(
      [
        "⭐ ลูกค้ากดเลือกทาเลนต์แล้ว!",
        `งาน: ${project.name ?? "-"}`,
        project.client_name ? `ลูกค้า: ${project.client_name}` : "",
        `ตอนนี้เลือกไว้ ${count ?? 0} คน`,
        "",
        `ดูรายชื่อที่ลูกค้าเลือก: ${SITE_URL}/admin/projects/${projectId}?trole=starred`,
      ].filter(Boolean),
    );
  } catch {
    // เงียบไว้ — สถานะบันทึกลง DB เรียบร้อยแล้ว แจ้งเตือนล้มเหลวไม่ควรทำให้
    // ลูกค้ากดปุ่มไม่ได้
    return;
  }

  // เขียนหลังส่งสำเร็จเท่านั้น — ส่งไม่ออก (เช่นโควตาเต็ม) จะได้มีโอกาสแจ้งใหม่
  await supabase
    .from("projects")
    .update({ client_select_notified_at: new Date().toISOString() })
    .eq("id", projectId);
}
