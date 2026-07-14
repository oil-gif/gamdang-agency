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
