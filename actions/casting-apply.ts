"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyTalents } from "@/actions/talents";
import { notifyAdmin } from "@/lib/admin-notify";
import { getTalentSession } from "@/lib/auth/talent-session";
import { verifyLineIdToken } from "@/lib/line-verify";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/lib/supabase/server";

const BASE = SITE_URL;

// ชื่อ Role (ถ้าเลือก) — ไว้ใส่ในข้อความแจ้งเตือน admin
async function roleTitle(roleId: string | null) {
  if (!roleId) return null;
  const { data } = await supabase
    .from("project_roles")
    .select("title")
    .eq("id", roleId)
    .maybeSingle();
  return data?.title ?? null;
}

export type CastingProfile = {
  id: string;
  name: string;
  code: string | null;
  photo_path: string | null;
  alreadyApplied: boolean;
};

// โปรไฟล์ของสมาชิก (บัญชี LINE นี้) สำหรับกดสมัคร casting โดยไม่ต้องกรอกใหม่
// คืน loggedIn=false ถ้ายังไม่ได้ login → หน้าเว็บจะโชว์ปุ่มลงทะเบียน
export async function getMyProfilesForCasting(
  projectId: string,
): Promise<{ loggedIn: boolean; profiles: CastingProfile[] }> {
  const session = await getTalentSession();
  if (!session) return { loggedIn: false, profiles: [] };

  const talents = await getMyTalents();
  if (talents.length === 0) return { loggedIn: true, profiles: [] };

  const ids = talents.map((t) => t.id);
  const { data: apps } = await supabase
    .from("project_applications")
    .select("talent_id")
    .eq("project_id", projectId)
    .in("talent_id", ids);
  const applied = new Set((apps ?? []).map((a) => a.talent_id));

  return {
    loggedIn: true,
    profiles: talents.map((t) => ({
      id: t.id,
      name: t.nickname_th || t.nickname_en || "ยังไม่ตั้งชื่อ",
      code: t.code ?? null,
      photo_path: t.photo_path ?? null,
      alreadyApplied: applied.has(t.id),
    })),
  };
}

// สมาชิกกดสมัคร: เลือกโปรไฟล์ (ลูกได้หลายคน) → สร้าง application รอ approve
// ไม่ต้องกรอกประวัติใหม่ เพราะมีในระบบแล้ว
export async function applyAsMembers(formData: FormData) {
  const projectId = str(formData, "project_id");
  const session = await getTalentSession();
  if (!projectId) redirect("/casting");
  if (!session) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("กรุณาเข้าสู่ระบบด้วย LINE ก่อน")}`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, is_published, casting_closed")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || !project.is_published || project.casting_closed) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("งานนี้ปิดรับสมัครแล้ว")}`);
  }

  const talentIds = formData.getAll("talent_ids").map(String).filter(Boolean);
  if (talentIds.length === 0) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("กรุณาเลือกโปรไฟล์ที่จะสมัคร")}`);
  }

  // กันสมัครข้ามบัญชี — เอาเฉพาะ talent ที่เป็นของ LINE นี้จริง
  const { data: owned } = await supabase
    .from("talents")
    .select("id")
    .eq("line_user_id", session!.lineUserId)
    .in("id", talentIds);
  const validIds = (owned ?? []).map((o) => o.id);
  if (validIds.length === 0) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("ไม่พบโปรไฟล์ที่เลือก")}`);
  }

  const roleId = str(formData, "role_id");
  const note = str(formData, "note");
  const rows = validIds.map((tid) => ({
    project_id: projectId,
    talent_id: tid,
    role_id: roleId,
    note,
  }));
  // upsert + ignoreDuplicates → กดซ้ำไม่ error (unique project_id+talent_id)
  await supabase
    .from("project_applications")
    .upsert(rows, { onConflict: "project_id,talent_id", ignoreDuplicates: true });

  // แจ้งเตือน admin เข้ากลุ่ม
  const { data: names } = await supabase
    .from("talents")
    .select("nickname_th, nickname_en")
    .in("id", validIds);
  const who = (names ?? [])
    .map((n) => n.nickname_th || n.nickname_en || "-")
    .join(", ");
  const role = await roleTitle(roleId);
  await notifyAdmin([
    "🎬 มีผู้สมัคร Casting ใหม่! (สมาชิก)",
    `งาน: ${project.name}`,
    role ? `Role: ${role}` : "",
    `ผู้สมัคร: ${who} (${validIds.length} คน)`,
    "",
    `ดูผู้สมัคร: ${BASE}/admin/projects/${projectId}`,
  ].filter(Boolean));

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/casting/${projectId}?applied=1`);
}

// คนที่ไม่ผูก LINE กรอกฟอร์มเอง — บังคับแนบรูป Compcard (เอาไปเสนอลูกค้า)
// สร้าง talent (pending) + talent_photo(compcard) + application (pending)
export async function applyToCasting(formData: FormData) {
  const projectId = str(formData, "project_id");
  const nickname = str(formData, "nickname");
  const phone = str(formData, "phone");
  const photoPath = str(formData, "photo_path");
  const gender = str(formData, "gender");
  const height = str(formData, "height_cm");
  const weight = str(formData, "weight_kg");
  if (!projectId || !nickname || !phone || !photoPath || !gender || !height || !weight) {
    redirect(
      `/casting/${projectId}?error=${encodeURIComponent("กรุณากรอกชื่อเล่น เบอร์โทร เพศ ส่วนสูง น้ำหนัก และแนบรูป Compcard")}`,
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, is_published, casting_closed")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || !project.is_published || project.casting_closed) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("งานนี้ปิดรับสมัครแล้ว")}`);
  }

  // เชื่อม LINE ถ้าเปิดในแอป LINE (เผื่อกรอกเองแต่อยู่ใน LINE)
  const lineToken = str(formData, "line_id_token");
  const lineProfile = lineToken ? await verifyLineIdToken(lineToken) : null;

  const { data: talent, error: talentErr } = await supabase
    .from("talents")
    .insert({
      nickname_en: nickname,
      nickname_th: nickname,
      phone,
      gender,
      height_cm: Number(height),
      weight_kg: Number(weight),
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

  // เก็บรูปเป็น compcard ของ talent → เห็นในหน้าผู้สมัครหลังบ้าน เอาไปเสนอได้
  await supabase.from("talent_photos").insert({
    talent_id: talent.id,
    kind: "compcard",
    storage_path: photoPath,
  });

  const roleId = str(formData, "role_id");
  const { error: appErr } = await supabase.from("project_applications").insert({
    project_id: projectId,
    talent_id: talent.id,
    role_id: roleId,
    note: str(formData, "note"),
  });
  if (appErr) {
    redirect(`/casting/${projectId}?error=${encodeURIComponent("สมัครไม่สำเร็จ กรุณาลองใหม่")}`);
  }

  // แจ้งเตือน admin เข้ากลุ่ม
  const role = await roleTitle(roleId);
  await notifyAdmin([
    "🎬 มีผู้สมัคร Casting ใหม่! (กรอกเอง)",
    `งาน: ${project.name}`,
    role ? `Role: ${role}` : "",
    `ชื่อ: ${nickname} · โทร: ${phone}`,
    "",
    `ดูผู้สมัคร: ${BASE}/admin/projects/${projectId}`,
  ].filter(Boolean));

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/casting/${projectId}?applied=1`);
}

function str(formData: FormData, key: string) {
  const raw = formData.get(key);
  const v = typeof raw === "string" ? raw.trim() : "";
  return v === "" ? null : v;
}
