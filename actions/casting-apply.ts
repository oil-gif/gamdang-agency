"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyLineIdToken } from "@/lib/line-verify";
import { supabase } from "@/lib/supabase/server";

// คนกด "สมัคร/เข้าร่วม" จากหน้าประกาศงานสาธารณะ:
// สร้าง talent (pending) + project_application (pending) รอแอดมิน approve
// ถ้าเปิดใน LINE (ส่ง line_id_token) → ผูก LINE ให้เลย (จัดการโปรไฟล์เองได้)
export async function applyToCasting(formData: FormData) {
  const projectId = str(formData, "project_id");
  const nickname = str(formData, "nickname");
  const phone = str(formData, "phone");
  if (!projectId || !nickname || !phone) {
    redirect(
      `/casting/${projectId}?error=${encodeURIComponent("กรุณากรอกชื่อเล่นและเบอร์โทร")}`,
    );
  }

  // งานต้องเผยแพร่ + ยังเปิดรับ
  const { data: project } = await supabase
    .from("projects")
    .select("id, is_published, casting_closed")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || !project.is_published || project.casting_closed) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("งานนี้ปิดรับสมัครแล้ว")}`);
  }

  // เชื่อม LINE ถ้าเปิดในแอป LINE
  const lineToken = str(formData, "line_id_token");
  const lineProfile = lineToken ? await verifyLineIdToken(lineToken) : null;

  const { data: talent, error: talentErr } = await supabase
    .from("talents")
    .insert({
      nickname_en: nickname,
      nickname_th: nickname,
      phone,
      gender: str(formData, "gender"),
      dob: str(formData, "dob"),
      nationality: str(formData, "nationality"),
      email: str(formData, "email"),
      line_user_id: lineProfile?.lineUserId ?? null,
      line_display_name: lineProfile?.name ?? null,
      line_picture_url: lineProfile?.picture ?? null,
      is_model: true,
      source: "self",
      status: "pending",
    })
    .select("id")
    .single();
  if (talentErr || !talent) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("สมัครไม่สำเร็จ กรุณาลองใหม่")}`);
  }

  const { error: appErr } = await supabase.from("project_applications").insert({
    project_id: projectId,
    talent_id: talent.id,
    role_id: str(formData, "role_id"),
    note: str(formData, "note"),
  });
  if (appErr) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("สมัครไม่สำเร็จ กรุณาลองใหม่")}`);
  }

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/casting/${projectId}?applied=1`);
}

function str(formData: FormData, key: string) {
  const raw = formData.get(key);
  const v = typeof raw === "string" ? raw.trim() : "";
  return v === "" ? null : v;
}
