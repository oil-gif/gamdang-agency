"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";

export async function getInboxPhotos() {
  const { data, error } = await supabase
    .from("photo_inbox")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// รายชื่อ talent ทั้งหมดสำหรับ dropdown มอบหมายรูป
export async function getAssignableTalents() {
  const { data, error } = await supabase
    .from("talents")
    .select("id, code, nickname_th, nickname_en")
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// มอบหมายรูปจาก inbox ให้ talent: ย้ายไฟล์จาก _unassigned/ ไปโฟลเดอร์จริง
// แล้วสร้าง row ใน talent_photos (compcard = แทนที่ใบเดิมเหมือน /api/upload)
export async function assignInboxPhoto(formData: FormData) {
  const inboxId = String(formData.get("inbox_id"));
  const talentId = String(formData.get("talent_id"));
  const kind = String(formData.get("kind"));
  if (!talentId) return;
  if (kind !== "gallery" && kind !== "compcard") return;

  const { data: inbox } = await supabase
    .from("photo_inbox")
    .select("id, storage_path")
    .eq("id", inboxId)
    .maybeSingle();
  if (!inbox) return;

  const newPath = `${talentId}/${kind}/${randomUUID()}.webp`;
  const { error: moveError } = await supabase.storage
    .from("talent-photos")
    .move(inbox.storage_path, newPath);
  if (moveError) throw new Error(moveError.message);

  // compcard มีได้ใบเดียว — ลบใบเดิมทิ้งก่อน
  if (kind === "compcard") {
    const { data: existing } = await supabase
      .from("talent_photos")
      .select("id, storage_path")
      .eq("talent_id", talentId)
      .eq("kind", "compcard")
      .maybeSingle();
    if (existing) {
      await supabase.storage.from("talent-photos").remove([existing.storage_path]);
      await supabase.from("talent_photos").delete().eq("id", existing.id);
    }
  }

  const { data: photoRow, error: insertError } = await supabase
    .from("talent_photos")
    .insert({ talent_id: talentId, kind, storage_path: newPath })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);

  if (kind === "compcard") {
    await supabase
      .from("talents")
      .update({ compcard_photo_id: photoRow.id })
      .eq("id", talentId);
  }

  await supabase.from("photo_inbox").delete().eq("id", inboxId);
  revalidatePath("/admin/photos");
  revalidatePath(`/admin/talents/${talentId}`);
}

export async function deleteInboxPhoto(formData: FormData) {
  const inboxId = String(formData.get("inbox_id"));
  const { data: inbox } = await supabase
    .from("photo_inbox")
    .select("id, storage_path")
    .eq("id", inboxId)
    .maybeSingle();
  if (!inbox) return;
  await supabase.storage.from("talent-photos").remove([inbox.storage_path]);
  await supabase.from("photo_inbox").delete().eq("id", inboxId);
  revalidatePath("/admin/photos");
}
