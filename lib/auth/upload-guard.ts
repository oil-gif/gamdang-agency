import "server-only";
import { getTalentSession } from "@/lib/auth/talent-session";
import { isAdminAuthed } from "@/lib/supabase/auth-server";
import { supabase } from "@/lib/supabase/server";

// ยามกลางของ API ที่แก้ไขรูป/ข้อมูลของ talent
//
// ⚠️ ของเดิมเขียนว่า `if (talentSession && !admin) { ...ตรวจเจ้าของ... }`
// ซึ่งแปลว่า **ถ้าไม่มี session เลย จะข้ามการตรวจทั้งหมด** → ใครก็ยิงรูปทับ
// โปรไฟล์คนอื่นได้ถ้ารู้ talent id (พบ 2026-08-20)
//
// กติกาใหม่: ผ่านได้เฉพาะ "แอดมิน" หรือ "เจ้าของโปรไฟล์นั้น" เท่านั้น
// ไม่มี session = ปฏิเสธ ไม่ใช่ปล่อยผ่าน
export type GuardResult = { ok: true } | { ok: false; status: number; error: string };

export async function guardTalentWrite(talentId: string): Promise<GuardResult> {
  if (!talentId) {
    return { ok: false, status: 400, error: "missing talent_id" };
  }
  if (await isAdminAuthed()) return { ok: true };

  const session = await getTalentSession();
  if (!session) {
    return { ok: false, status: 401, error: "กรุณาเข้าสู่ระบบก่อนค่ะ" };
  }

  const { data: owned } = await supabase
    .from("talents")
    .select("id")
    .eq("id", talentId)
    .eq("line_user_id", session.lineUserId)
    .maybeSingle();
  if (!owned) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}

// สำหรับ API ที่ควรใช้ได้เฉพาะแอดมิน (เช่น อัพรูป batch เข้าคลังกลาง)
export async function guardAdminOnly(): Promise<GuardResult> {
  if (await isAdminAuthed()) return { ok: true };
  return { ok: false, status: 401, error: "unauthorized" };
}
