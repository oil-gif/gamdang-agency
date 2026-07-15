"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";

// ===== รอบถ่าย (shooting days) =====

export async function getShootDays() {
  const { data: days, error } = await supabase
    .from("shoot_days")
    .select("*")
    .order("shoot_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (!days || days.length === 0) return [];

  const { data: bookings } = await supabase
    .from("shoot_bookings")
    .select("shoot_day_id, status")
    .in(
      "shoot_day_id",
      days.map((d) => d.id),
    );

  return days.map((d) => {
    const mine = (bookings ?? []).filter((b) => b.shoot_day_id === d.id);
    return {
      ...d,
      booking_count: mine.filter((b) => b.status !== "rejected").length,
      pending_count: mine.filter((b) => b.status === "pending").length,
    };
  });
}

export async function getShootDay(id: string) {
  const { data, error } = await supabase
    .from("shoot_days")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getShootBookings(dayId: string) {
  const { data, error } = await supabase
    .from("shoot_bookings")
    .select("*")
    .eq("shoot_day_id", dayId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// จำนวนสลิปรอตรวจทั้งหมด (badge ใน nav + dashboard)
// ใช้ใน layout ของแอดมินทุกหน้า — อ่านแบบกันพัง ถ้าตารางยังไม่ถูก migrate
// (007) ให้คืน 0 แทนที่จะทำทั้งแอดมินล่ม
export async function getBookingPendingCount() {
  try {
    const { count, error } = await supabase
      .from("shoot_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function str(formData: FormData, key: string) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
}

export async function createShootDay(formData: FormData) {
  const shootDate = str(formData, "shoot_date");
  if (!shootDate) {
    redirect(`/admin/shoots?error=${encodeURIComponent("กรุณาเลือกวันที่")}`);
  }
  const { data: created, error } = await supabase
    .from("shoot_days")
    .insert({
      shoot_date: shootDate,
      location: str(formData, "location"),
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/shoots");
  redirect(`/admin/shoots/${created.id}`);
}

export async function saveShootDay(formData: FormData) {
  const id = String(formData.get("id"));
  const shootDate = str(formData, "shoot_date");
  if (!shootDate) {
    redirect(`/admin/shoots/${id}?error=${encodeURIComponent("กรุณาเลือกวันที่")}`);
  }
  const status = str(formData, "status") === "published" ? "published" : "draft";
  const { error } = await supabase
    .from("shoot_days")
    .update({
      shoot_date: shootDate,
      location: str(formData, "location"),
      details: str(formData, "details"),
      status,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/shoots");
  revalidatePath(`/admin/shoots/${id}`);
  revalidatePath("/booking");
}

// เปิด/ปิดห้อง (photo|video) รายชั่วโมง
export async function toggleShootSlot(formData: FormData) {
  const id = String(formData.get("id"));
  const hour = String(formData.get("hour"));
  const room = String(formData.get("room")); // photo | video
  if (room !== "photo" && room !== "video") return;

  const { data: day } = await supabase
    .from("shoot_days")
    .select("slots")
    .eq("id", id)
    .maybeSingle();
  if (!day) return;

  const slots = (day.slots ?? {}) as Record<
    string,
    { photo_open?: boolean; video_open?: boolean }
  >;
  const key = `${room}_open` as const;
  const current = slots[hour]?.[key] !== false;
  slots[hour] = { ...slots[hour], [key]: !current };

  const { error } = await supabase
    .from("shoot_days")
    .update({ slots })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shoots/${id}`);
  revalidatePath("/booking");
}

export async function deleteShootDay(formData: FormData) {
  const id = String(formData.get("id"));
  // ลบสลิปทั้งหมดของรอบนี้ออกจาก storage ก่อน (cascade ลบแค่ row)
  const { data: bookings } = await supabase
    .from("shoot_bookings")
    .select("slip_path")
    .eq("shoot_day_id", id);
  const paths = (bookings ?? []).map((b) => b.slip_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("booking-slips").remove(paths);
  }
  const { error } = await supabase.from("shoot_days").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/shoots");
  redirect("/admin/shoots");
}

// ===== ตรวจสลิป: approve / reject (สลับกลับได้) =====
export async function setBookingStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  const status = String(formData.get("status"));
  if (!["pending", "approved", "rejected"].includes(status)) return;
  const { error } = await supabase
    .from("shoot_bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/admin/shoots");
  revalidatePath("/booking");
}

// signed URL ดูสลิป (bucket ส่วนตัว) — อายุ 1 ชม.
export async function getSlipUrl(path: string) {
  const { data } = await supabase.storage
    .from("booking-slips")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ค้นหาการจองข้ามทุกรอบ: ชื่อ / ชื่อเล่น / เบอร์โทร / รหัส talent ที่ผูกไว้
// — ไว้ตามหาคิวตอนแก้ไขหรือเช็คอินหน้างาน (จำกัด 20 รายการ)
export async function searchBookings(q: string) {
  const term = q.trim().replace(/[%,]/g, "");
  if (!term) return [];

  // รหัส talent (เช่น FF979D / GD-0009) → หา booking ที่ผูกกับคนนั้น
  const { data: codeTalents } = await supabase
    .from("talents")
    .select("id")
    .ilike("code", `%${term}%`)
    .limit(5);
  const talentIds = (codeTalents ?? []).map((t) => t.id);

  let query = supabase
    .from("shoot_bookings")
    .select("*, shoot_day:shoot_days(id, shoot_date, location)")
    .order("created_at", { ascending: false })
    .limit(20);
  const ors = [
    `full_name.ilike.%${term}%`,
    `nickname.ilike.%${term}%`,
    `phone.ilike.%${term}%`,
  ];
  if (talentIds.length > 0) {
    ors.push(`talent_id.in.(${talentIds.join(",")})`);
  }
  query = query.or(ors.join(","));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// ===== เช็คชื่อหน้างานวันถ่าย (Photoshoot Overview) =====
export async function setBookingArrival(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  const arrived = formData.get("arrived") === "1";
  const { error } = await supabase
    .from("shoot_bookings")
    .update({ arrived_at: arrived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shoots/${dayId}`);
}

// ดึงคนจองเข้าระบบสมัครสมาชิก: สร้าง talent จากข้อมูลการจอง (prefill
// ชื่อ/ชื่อเล่น/เบอร์/ส่วนสูง/น้ำหนัก) แล้วผูก booking → talent
// จากนั้นแอดมินใช้ปุ่ม "สร้างลิงก์เชื่อม LINE" ในหน้า talent ต่อได้เลย
export async function createTalentFromBooking(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));

  const { data: b } = await supabase
    .from("shoot_bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!b) return;
  if (b.talent_id) return; // ผูกแล้ว ไม่สร้างซ้ำ

  const num = (v: string | null) => {
    const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const { data: talent, error } = await supabase
    .from("talents")
    .insert({
      full_name: b.full_name,
      // ชื่อเล่นจากฟอร์มจองเป็นภาษาอังกฤษ → ลงช่อง nickname_en ให้ตรง
      // nickname_th ใส่ค่าเดียวกันไว้ก่อน (แอดมินแก้เป็นชื่อไทยทีหลังได้)
      nickname_en: b.nickname,
      nickname_th: b.nickname || b.full_name,
      gender: b.gender ?? null,
      dob: b.dob ?? null,
      nationality: b.nationality ?? null,
      phone: b.phone,
      email: b.email,
      contact_line_or_whatsapp: b.line_id,
      height_cm: num(b.height),
      weight_kg: num(b.weight),
      note: [
        `มาจากระบบจองถ่ายโปรไฟล์ (Package ${b.package})`,
        b.talents_note ? `ความสามารถพิเศษ: ${b.talents_note}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      is_model: true,
      source: "admin",
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("shoot_bookings")
    .update({ talent_id: talent.id })
    .eq("id", id);

  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/admin/talents");
}
