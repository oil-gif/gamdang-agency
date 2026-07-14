"use server";

import { revalidatePath } from "next/cache";
import { createJobToken } from "@/lib/auth/talent-session";
import { buildJobOfferFlex, pushLineMessage } from "@/lib/line-messaging";
import { supabase } from "@/lib/supabase/server";

const BASE_URL = "https://gamdang-app.vercel.app";

// แอดมินกด "แจ้งงานทาง LINE" — push Flex ไปหา talent ที่ผูก LINE แล้ว
export async function notifyTalentViaLine(formData: FormData) {
  const ptId = String(formData.get("pt_id"));

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id, talent_response, talent:talents(line_user_id, nickname_th), project:projects(name, client_name, shooting_date, budget)")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt) throw new Error("ไม่พบแถวนี้");

  // supabase join returns object (not array) for FK relations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const talent = pt.talent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = pt.project as any;
  if (!talent?.line_user_id) {
    throw new Error("talent คนนี้ยังไม่ได้ผูก LINE — ใช้ปุ่มคัดลอกข้อความแทน");
  }

  const token = await createJobToken(pt.id);
  const flex = buildJobOfferFlex({
    projectName: project.name,
    clientName: project.client_name,
    shootingDate: project.shooting_date,
    budget: project.budget,
    jobUrl: `${BASE_URL}/job/${token}`,
  });
  await pushLineMessage(talent.line_user_id, [flex]);

  // ยังไม่เคยตอบ → ตั้งเป็น "รอตอบ" ให้แอดมินเห็นว่าแจ้งไปแล้ว
  if (!pt.talent_response) {
    await supabase
      .from("project_talents")
      .update({ talent_response: "pending" })
      .eq("id", pt.id);
  }
  revalidatePath(`/admin/projects/${pt.project_id}`);
}

// แอดมินกดคัดลอกข้อความ (สำหรับคนไม่ผูก LINE) — mark ว่าแจ้งแล้ว
export async function markJobNotified(ptId: string) {
  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id, talent_response")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt) return;
  if (!pt.talent_response) {
    await supabase
      .from("project_talents")
      .update({ talent_response: "pending" })
      .eq("id", pt.id);
  }
  revalidatePath(`/admin/projects/${pt.project_id}`);
}
