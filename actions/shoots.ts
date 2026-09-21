"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { thaiDateLabel } from "@/lib/booking";
import { ACK_LABEL, buildAckText } from "@/lib/booking-ack";
import { formatThaiDate } from "@/lib/datetime";
import { BOOKING, BOOKING_FREED_STATUSES } from "@/lib/constants";
import { verifyDangerCode } from "@/lib/danger";
import {
  classifyLineError,
  pushLineMessage,
  type LineFailReason,
} from "@/lib/line-messaging";
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
      booking_count: mine.filter(
        (b) => !BOOKING_FREED_STATUSES.includes(b.status as "rejected"),
      ).length,
      postponed_count: mine.filter((b) => b.status === "postponed").length,
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

// พากลับมาที่ "หน้าที่แอดมินยืนอยู่" ของคิวจอง
//
// ตั้งแต่คิวถูกแบ่งหน้า (สถานะ ?bs= / หน้า ?bpage= / คำค้น ?bq=) การ redirect
// กลับไป /admin/shoots/[id] เฉยๆ จะเด้งกลับหน้า 1 ทุกครั้งที่กดปุ่ม — คนที่
// กำลังตรวจคิวหน้า 3 อยู่จะหลงทันที · ฟอร์มแต่ละใบเลยแนบ hidden "view" =
// query string ปัจจุบันมาด้วย แล้วเอามาต่อกลับตรงนี้
function backToDay(
  dayId: string,
  formData: FormData,
  extra?: Record<string, string>,
) {
  const raw = String(formData.get("view") ?? "").replace(/^\?/, "");
  // อ่านเฉพาะคีย์ที่รู้จัก — กันคนยัด query แปลกๆ ผ่านฟอร์ม
  const incoming = new URLSearchParams(raw);
  const p = new URLSearchParams();
  // bp/ba = ตัวกรองแพ็กเกจ/เช็คอิน (เพิ่ม 2026-09-14) — ต้องพากลับด้วย
  // ไม่งั้นกดเช็คอินแล้วตัวกรองหลุด แอดมินหลงหน้า
  for (const key of ["bs", "bp", "ba", "bpage", "bq"]) {
    const v = incoming.get(key);
    if (v) p.set(key, v);
  }
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  const qs = p.toString();
  return `/admin/shoots/${dayId}${qs ? `?${qs}` : ""}#queue`;
}

export async function getShootBookings(dayId: string) {
  // ดึงวันเกิด/ส่วนสูงจากโปรไฟล์ Talent มาด้วย (ถ้าคิวนี้ผูกโปรไฟล์แล้ว)
  //
  // ⚠️ `shoot_bookings.dob` คือสำเนาที่ผู้ปกครองกรอกตอนจอง — แก้ไม่ได้จากหลังบ้าน
  // พอแอดมินไปแก้วันเกิดที่โปรไฟล์ การ์ดคิวจองยังโชว์ของเก่าค้างอยู่
  // (พี่เจ้าของเจอ 2026-09-20: Harper โปรไฟล์ 1 ปี 1 ด. แต่การ์ดโชว์ 1 เดือน ·
  // ทั้งระบบมี 4 คิวที่ไม่ตรงกัน หนักสุดคือ FOURTH การ์ดโชว์ 62 ปี แทนที่จะเป็น 19)
  // → โปรไฟล์คือแหล่งข้อมูลที่ทีมงานดูแล ให้ยึดโปรไฟล์เป็นหลัก
  const { data, error } = await supabase
    .from("shoot_bookings")
    .select("*, talent:talents(dob, height_cm, weight_kg)")
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
  // ⚠️ กู้คืนไม่ได้ (ลบการจองทั้งรอบ + สลิป) — ต้องผ่านรหัสยืนยันชั้นที่ 2
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(
      `/admin/shoots/${id}?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบรอบถ่าย")}`,
    );
  }
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

// คนขอเลื่อนรอบ — ตามต่อว่าใครกลับมาจองรอบใหม่แล้วบ้าง
//
// พี่เจ้าของแจ้ง 2026-09-06: คนขอเลื่อนเดิมต้องกด "ปฏิเสธ" ซึ่งผิดความหมาย
// และหายไปเลย ตามต่อไม่ได้ · ตอนนี้กด "เลื่อนไปรอบหน้า" แล้วมาโผล่ที่นี่
//
// "กลับมาจองแล้ว" = มีคิวใบใหม่ที่ (เบอร์เดียวกัน หรือ LINE user เดียวกัน)
// และจองทีหลังใบที่เลื่อน · เทียบเบอร์แบบเอาอักขระที่ไม่ใช่ตัวเลขออกก่อน
// เพราะคนกรอกมาหลายแบบ (086-123-4567 / 0861234567 / +66861234567)
function digitsOnly(v: string | null | undefined) {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : ""; // ตัดรหัสประเทศ/เลข 0 นำหน้าออก
}

// เทียบชื่อแบบหลวมๆ — ตัดช่องว่าง/วรรคตอน แล้วเทียบตัวพิมพ์เล็ก
// (ข้อมูลจริงมีเว้นวรรคซ้ำ เช่น "ชนณณี  พันทวี")
function nameKey(v: string | null | undefined) {
  return (v ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export async function getPostponedBookings() {
  const { data: postponed, error } = await supabase
    .from("shoot_bookings")
    .select(
      "id, status, full_name, nickname, nickname_th, phone, line_id, line_user_id, hour, package, created_at, shoot_day_id, slip_path, talent_id, height, weight, dob, shoot_day:shoot_days(id, shoot_date, location), talent:talents(dob, height_cm, weight_kg)",
    )
    .eq("status", "postponed")
    .order("created_at", { ascending: false });
  // ตารางยังไม่รู้จักสถานะนี้ (ยังไม่รัน migration 025) → คืน [] ไม่ให้หน้าพัง
  if (error || !postponed || postponed.length === 0) return [];

  // ⚠️ ห้ามดึง booking ทั้งตารางมาเทียบ — PostgREST ตัดที่ 1000 แถว แล้วจะ
  // "หา" คนที่กลับมาจองไม่เจอแบบเงียบๆ (เคยโดนมาแล้วกับ talent_photos)
  // ดึงเฉพาะใบที่จองหลังใบเลื่อนที่เก่าที่สุด = เท่าที่จำเป็นจริงๆ
  const earliest = postponed.reduce(
    (min, p) => (p.created_at < min ? p.created_at : min),
    postponed[0].created_at as string,
  );
  const { data: later } = await supabase
    .from("shoot_bookings")
    .select(
      "id, status, full_name, nickname, phone, line_user_id, hour, created_at, shoot_day:shoot_days(id, shoot_date)",
    )
    .gt("created_at", earliest)
    .not("status", "in", "(postponed,rejected)")
    .order("created_at", { ascending: false })
    .limit(1000);
  const candidates = later ?? [];

  return postponed.map((p) => {
    const key = digitsOnly(p.phone);
    const nameKeys = [nameKey(p.full_name), nameKey(p.nickname)].filter(Boolean);
    const newer = candidates.filter(
      (o) => o.id !== p.id && o.created_at > p.created_at,
    );

    // ⚠️ เบอร์เดียวกัน "ไม่ใช่คนเดียวกัน" เสมอไป — ข้อมูลจริงมี 8 เบอร์ที่พี่น้อง
    // ใช้ร่วมกัน (พ่อแม่พาลูกมาถ่ายทีละคน นามสกุลเดียวกัน เบอร์เดียวกัน)
    // ถ้าจับคู่ด้วยเบอร์อย่างเดียว น้องคนพี่มาจอง = ระบบบอกว่าคนน้องกลับมาแล้ว
    // → LINE user id ตรง = มั่นใจ · เบอร์+ชื่อตรง = มั่นใจ ·
    //   เบอร์ตรงแต่ชื่อไม่ตรง = แค่ "น่าจะ" ให้แอดมินกดดูเอง
    const sure = newer.find(
      (o) =>
        (!!p.line_user_id && o.line_user_id === p.line_user_id) ||
        (key &&
          digitsOnly(o.phone) === key &&
          nameKeys.some(
            (n) => n === nameKey(o.full_name) || n === nameKey(o.nickname),
          )),
    );
    const maybe =
      sure ?? newer.find((o) => key && digitsOnly(o.phone) === key);
    return {
      ...p,
      rebooked: sure ?? maybe ?? null,
      matchKind: sure ? ("sure" as const) : maybe ? ("maybe" as const) : null,
    };
  });
}

// ===== ย้ายคนที่ขอเลื่อน → ลงรอบใหม่ (ขอ 2026-09-21) =====

// รอบที่ย้ายไปได้: ยังไม่ผ่านวัน · รวมรอบที่ยังไม่เปิดจอง (draft) ด้วย
// เพื่อให้แอดมินจองที่ให้คนที่เลื่อนไว้ก่อนเปิดจองสาธารณะ
export async function getRescheduleTargets() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: days } = await supabase
    .from("shoot_days")
    .select("id, shoot_date, location, status, slots")
    .gte("shoot_date", today)
    .order("shoot_date");
  if (!days || days.length === 0) return [];

  const { data: taken } = await supabase
    .from("shoot_bookings")
    .select("shoot_day_id, hour, package")
    .in("shoot_day_id", days.map((d) => d.id))
    .not("status", "in", `(${BOOKING_FREED_STATUSES.join(",")})`);

  return days.map((d) => {
    const mine = (taken ?? []).filter((b) => b.shoot_day_id === d.id);
    const slots = (d.slots ?? {}) as Record<string, { photo_open?: boolean }>;
    return {
      id: d.id as string,
      label: thaiDateLabel(d.shoot_date),
      location: (d.location as string | null) ?? null,
      published: d.status === "published",
      hours: BOOKING.hours.map((hour) => {
        const here = mine.filter((b) => b.hour === hour);
        return {
          hour,
          photoLeft: Math.max(BOOKING.photoCap - here.length, 0),
          videoLeft: Math.max(
            BOOKING.videoCap - here.filter((b) => b.package === "A").length,
            0,
          ),
          // ปิดรับบนหน้าเว็บ — แอดมินยังใส่คนได้ถ้าที่นั่งเหลือ
          publicClosed: slots[hour]?.photo_open === false,
        };
      }),
    };
  });
}

const RESCHEDULE_ERRORS: Record<string, string> = {
  full: "รอบเวลานั้นเต็มแล้ว — เลือกเวลาอื่นค่ะ",
  full_video: "ห้องวิดีโอรอบนั้นเต็มแล้ว — เลือกเวลาอื่น หรือเปลี่ยนเป็น Package B",
  no_day: "ไม่พบรอบถ่ายนี้ หรือเป็นวันที่ผ่านมาแล้ว",
  not_postponed: "คิวนี้ถูกย้ายไปแล้ว (หรือไม่ได้อยู่ในสถานะเลื่อนรอบ)",
  not_found: "ไม่พบการจองนี้",
};

// ฟอร์มในแผง "ลงรอบใหม่" หน้า /admin/shoots
// intent=save → บันทึกข้อมูลติดต่ออย่างเดียว · intent=move → บันทึก + ย้ายรอบ
export async function rescheduleBooking(formData: FormData) {
  const id = String(formData.get("id"));
  const intent = String(formData.get("intent") ?? "save");
  const s = (k: string) => str(formData, k);
  const back = (extra: Record<string, string>) =>
    `/admin/shoots?${new URLSearchParams({ pp: id, ...extra })}#pp-${id}`;

  const fullName = s("full_name");
  const phone = s("phone");
  if (!fullName || !phone) {
    redirect(back({ pperr: "ต้องมีชื่อ-สกุล และเบอร์โทรค่ะ" }));
  }

  const { data: before } = await supabase
    .from("shoot_bookings")
    .select("shoot_day_id, talent_id")
    .eq("id", id)
    .maybeSingle();
  if (!before) redirect(back({ pperr: RESCHEDULE_ERRORS.not_found }));

  const info: Record<string, string | null> = {
    full_name: fullName,
    nickname: s("nickname"),
    nickname_th: s("nickname_th"),
    phone,
    line_id: s("line_id"),
  };
  // ผูกโปรไฟล์แล้ว → วันเกิด/สัดส่วนยึดโปรไฟล์ (การ์ดคิวก็อ่านจากโปรไฟล์)
  // ฟอร์มจึงไม่ส่งช่องพวกนี้มา · ไม่ผูก → แก้ที่ใบจองได้
  if (!before.talent_id) {
    info.height = s("height");
    info.weight = s("weight");
    info.dob = s("dob");
  }
  const { error: infoErr } = await supabase
    .from("shoot_bookings")
    .update(info)
    .eq("id", id);
  if (infoErr) redirect(back({ pperr: `บันทึกไม่สำเร็จ: ${infoErr.message}` }));

  revalidatePath("/admin/shoots");
  revalidatePath(`/admin/shoots/${before.shoot_day_id}`);
  if (intent !== "move") redirect(back({ ppsaved: "1" }));

  const dayId = String(formData.get("to_day") ?? "");
  const hour = String(formData.get("to_hour") ?? "");
  const pkg = String(formData.get("to_package") ?? "");
  const validHours: readonly string[] = BOOKING.hours;
  if (!dayId || !validHours.includes(hour) || !(pkg in BOOKING.packages)) {
    redirect(back({ pperr: "เลือกวันที่ เวลา และแพ็กเกจของรอบใหม่ให้ครบค่ะ" }));
  }

  const { error } = await supabase.rpc("reschedule_booking", {
    p_id: id,
    p_day: dayId,
    p_hour: hour,
    p_package: pkg,
    p_photo_cap: BOOKING.photoCap,
    p_video_cap: BOOKING.videoCap,
  });
  if (error) {
    const key = Object.keys(RESCHEDULE_ERRORS).find((k) =>
      new RegExp(`\\b${k}\\b`).test(error.message),
    );
    // ยังไม่ได้รัน migration 029
    const msg = key
      ? RESCHEDULE_ERRORS[key]
      : /reschedule_booking/.test(error.message)
        ? "ยังใช้ปุ่มนี้ไม่ได้ — ต้องรัน migration 029 ใน Supabase ก่อนค่ะ"
        : `ย้ายไม่สำเร็จ: ${error.message}`;
    redirect(back({ pperr: msg }));
  }

  // ที่กดรับทราบไว้เป็นของรอบเดิม — รอบใหม่ต้องรับทราบใหม่
  // (ส่ง LINE ด้านล่าง → ตัวส่งตั้งเวลาส่งให้เอง)
  await supabase
    .from("shoot_bookings")
    .update({ line_confirm_sent_at: null, line_ack_at: null })
    .eq("id", id);

  let line: LineSendResult | "off" = "off";
  if (formData.get("send_line") === "on") {
    line = await sendBookingConfirmedLine(id);
  }

  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/booking");
  redirect(
    `/admin/shoots?${new URLSearchParams({ moved: id, to: dayId, line })}`,
  );
}

// ===== ตรวจสลิป: approve / reject (สลับกลับได้) =====
export async function setBookingStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  const status = String(formData.get("status"));
  if (!["pending", "approved", "rejected", "postponed"].includes(status)) return;

  // สถานะเดิม — ส่ง LINE ยืนยันเฉพาะตอน "เพิ่งเปลี่ยนเป็น approved"
  // (กดซ้ำ/สลับกลับไปมาจะไม่ส่งซ้ำ)
  const { data: before } = await supabase
    .from("shoot_bookings")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("shoot_bookings")
    .update({ status })
    .eq("id", id);
  if (error) {
    // ยังไม่ได้รัน migration 025 → DB ยังไม่รู้จักสถานะ "postponed"
    // (CHECK constraint) · บอกให้รู้ว่าต้องทำอะไร ดีกว่าขึ้นหน้าจอพังเต็มจอ
    if (status === "postponed" && /constraint|check/i.test(error.message)) {
      redirect(
        backToDay(dayId, formData, {
          error:
            "ยังใช้ปุ่มเลื่อนรอบไม่ได้ — ต้องรัน migration 025 ใน Supabase ก่อนค่ะ",
        }),
      );
    }
    throw new Error(error.message);
  }

  let lineResult: LineSendResult | null = null;
  if (status === "approved" && before?.status !== "approved") {
    lineResult = await sendBookingConfirmedLine(id);
  }

  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/admin/shoots");
  revalidatePath("/booking");

  // ส่งไม่ออก → พากลับมาพร้อม flag ให้หน้าจอขึ้นเตือนว่าต้องแจ้งลูกค้าเอง
  if (lineResult === "quota" || lineResult === "failed") {
    redirect(backToDay(dayId, formData, { linefail: lineResult }));
  }
}

// ข้อความยืนยันรอบถ่าย (ใช้ทั้งส่ง LINE อัตโนมัติ และปุ่ม "คัดลอกข้อความ")
export async function buildBookingConfirmText(bookingId: string) {
  const { data: b } = await supabase
    .from("shoot_bookings")
    // `*` ไม่ระบุชื่อคอลัมน์ — rescheduled_from_* มาจาก migration 029 ถ้าระบุชื่อ
    // ตรงๆ แล้ว DB ยังไม่ได้รัน ข้อความยืนยันทุกใบจะส่งไม่ออก
    .select("*, shoot_day:shoot_days(shoot_date, location)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const day = b.shoot_day as any;
  const pkg = BOOKING.packages[b.package as keyof typeof BOOKING.packages];
  const name = [b.full_name, b.nickname ? `(${b.nickname})` : ""]
    .filter(Boolean)
    .join(" ");
  // ชื่อในปุ่มรับทราบ: ชื่อเล่นขึ้นก่อน — แอดมินจำน้องจากชื่อเล่น
  const nick = b.nickname_th || b.nickname;
  const ackName = nick ? `${nick} (${b.full_name})` : b.full_name;

  return {
    lineUserId: b.line_user_id as string | null,
    ackText: buildAckText({
      bookingId,
      name: ackName,
      when: `${day ? formatThaiDate(day.shoot_date, { year: undefined }) : "-"} ${b.hour} น.`,
    }),
    text: [
      "✅ แก้มแดง ยืนยันรอบถ่ายโปรไฟล์",
      name,
      // ย้ายมาจากรอบที่ขอเลื่อน (migration 029) — บอกให้ชัดว่ารอบเดิมยกเลิกแล้ว
      ...(b.rescheduled_from_date
        ? [
            `เลื่อนจากรอบ ${thaiDateLabel(b.rescheduled_from_date)}${b.rescheduled_from_hour ? ` ${b.rescheduled_from_hour} น.` : ""} มาเป็นรอบใหม่ด้านล่างเรียบร้อยแล้วค่ะ`,
          ]
        : []),
      "",
      `วันถ่าย: ${day ? thaiDateLabel(day.shoot_date) : "-"}${day?.location ? ` · ${day.location}` : ""}`,
      `รอบ: ${b.hour} น. · ${pkg ? `${pkg.name} (${pkg.subtitle})` : b.package}`,
      "",
      "ใกล้วันถ่ายทีมงานจะส่งแจ้งเตือนอีกครั้งค่ะ",
      "",
      `📌 รบกวนกดปุ่ม "${ACK_LABEL}" ด้านล่าง (หรือพิมพ์ตอบกลับ รับทราบ) เพื่อยืนยันรอบถ่ายด้วยนะคะ`,
      "",
      "ระหว่างรอถ่ายรูปและคอมการ์ดจากแก้มแดง สามารถจัดการโปรไฟล์และเพิ่มรูปถ่ายของตนเองก่อนได้ที่",
      `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID ?? "2010689219-wGKbITGb"}`,
    ].join("\n"),
  };
}

// ส่งข้อความยืนยันเข้า LINE ของคนจอง (best-effort — พังก็ไม่ทำให้อนุมัติล้ม)
//
// คืนสาเหตุที่ส่งไม่ได้กลับไปด้วย เพื่อเอาไปเตือนแอดมินบนหน้าจอ · ของเดิม
// กลืน error เงียบๆ แอดมินเลยเห็นว่า "อนุมัติสำเร็จ" ทั้งที่ลูกค้าไม่ได้รับอะไร
// (เจอจริง 2026-08-21 ตอนโควตา LINE เต็ม)
type LineSendResult = "sent" | "no-line" | LineFailReason;

async function sendBookingConfirmedLine(bookingId: string): Promise<LineSendResult> {
  try {
    const built = await buildBookingConfirmText(bookingId);
    if (!built?.lineUserId) return "no-line"; // จองจาก browser (ไม่ผูก LINE) → ข้าม
    // ปุ่ม Quick Reply "รับทราบค่ะ" — ไม่นับเป็นข้อความเพิ่ม (ยัง 1 ข้อความ)
    // ขึ้นเฉพาะ LINE มือถือ · LINE บนคอมไม่มีปุ่ม เลยมีบรรทัด "หรือพิมพ์ รับทราบ"
    await pushLineMessage(built.lineUserId, [
      {
        type: "text",
        text: built.text,
        quickReply: {
          items: [
            {
              type: "action",
              action: { type: "message", label: ACK_LABEL, text: built.ackText },
            },
          ],
        },
      },
    ]);
    // ข้อความใหม่ = ต้องรับทราบใหม่ (เช่น ย้ายรอบแล้วส่งยืนยันรอบใหม่)
    // ยังไม่ได้รัน migration 030 → update พลาดเงียบๆ ไม่ทำให้การส่งล้ม
    await supabase
      .from("shoot_bookings")
      .update({ line_confirm_sent_at: new Date().toISOString(), line_ack_at: null })
      .eq("id", bookingId);
    return "sent";
  } catch (e) {
    console.error("booking confirm LINE failed", e);
    // LINE ตอบ 429 = ส่งครบ 300 ข้อความ/เดือนของแพ็กเกจฟรีแล้ว
    return classifyLineError(e);
  }
}

// ปุ่ม "ส่ง LINE ยืนยันอีกครั้ง" ในหลังบ้าน (เผื่อส่งซ้ำ/ส่งย้อนหลัง)
export async function resendBookingConfirmLine(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  // ใช้ตัวส่งเดียวกับตอนอนุมัติ — ได้ปุ่มรับทราบ + บันทึกเวลาส่งเหมือนกัน
  // (ตัวส่งกลืน error ไว้แล้ว ไม่มีทางขึ้นหน้า "This page couldn't load")
  const result = await sendBookingConfirmedLine(id);
  if (result === "no-line") {
    redirect(
      backToDay(dayId, formData, {
        error: "คนนี้ไม่ได้จองผ่าน LINE — โทรหรือทักแจ้งเองนะคะ",
      }),
    );
  }

  revalidatePath(`/admin/shoots/${dayId}`);
  redirect(
    backToDay(
      dayId,
      formData,
      result === "sent" ? { linesent: "1" } : { linefail: result },
    ),
  );
}

// แอดมินจองแทนลูกค้า (คนจองเองไม่เป็น / ติดปัญหาอุปกรณ์ / walk-in)
// — ใช้ RPC ตัวเดียวกับหน้าจองสาธารณะ จึงเช็คที่นั่งเต็ม + กันจองชนเหมือนกัน
// — ไม่ต้องแนบสลิป (ถือว่าแอดมินตรวจการจ่ายเงินมาแล้ว) → ตั้งเป็น approved เลย
export async function createBookingAsAdmin(formData: FormData) {
  const dayId = String(formData.get("day_id"));
  const s = (k: string) => {
    const v = formData.get(k);
    const t = typeof v === "string" ? v.trim() : "";
    return t === "" ? null : t;
  };
  const pkg = String(formData.get("package") ?? "");
  const hour = String(formData.get("hour") ?? "");
  const fullName = s("full_name") ?? s("nickname");
  const phone = s("phone");

  const back = (extra: Record<string, string>) =>
    backToDay(dayId, formData, extra);
  if (!fullName || !phone || !hour || !(pkg in BOOKING.packages)) {
    redirect(
      back({ error: "กรอกให้ครบ: ชื่อ เบอร์โทร รอบเวลา และแพ็กเกจ" }),
    );
  }

  // สลิปโอนเงิน (ไม่บังคับ) — เก็บ bucket ส่วนตัวเดียวกับการจองปกติ
  // เพื่อให้ดูย้อนหลัง/ตรวจสอบได้เหมือนกัน
  let slipPath = "";
  const slip = formData.get("slip");
  if (slip instanceof File && slip.size > 0) {
    const ext = (slip.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    slipPath = `${dayId}/${randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("booking-slips")
      .upload(slipPath, slip, {
        contentType: slip.type || "image/jpeg",
      });
    if (upErr) {
      redirect(
        back({ error: `อัพโหลดสลิปไม่สำเร็จ: ${upErr.message}` }),
      );
    }
  }

  const { data: bookingId, error } = await supabase.rpc("book_shoot_slot", {
    p_day: dayId,
    p_package: pkg,
    p_hour: hour,
    p_full_name: fullName,
    p_nickname: s("nickname"),
    p_phone: phone,
    p_line_id: s("line_id"),
    p_email: s("email"),
    p_height: s("height"),
    p_weight: s("weight"),
    p_talents: s("talents_note"),
    // ไม่แนบสลิป → สตริงว่าง (คอลัมน์เป็น NOT NULL ตั้งแต่ migration 007)
    // ทุกจุดที่อ่านเช็คแบบ falsy อยู่แล้ว → ขึ้น "ไม่มีสลิป" ไม่พัง
    p_slip_path: slipPath,
    p_photo_cap: BOOKING.photoCap,
    p_video_cap: BOOKING.videoCap,
  });
  if (error) {
    // จองไม่ผ่าน → เก็บกวาดสลิปที่เพิ่งอัพ ไม่ให้ไฟล์ค้างใน storage
    if (slipPath) {
      await supabase.storage.from("booking-slips").remove([slipPath]);
    }
    const msg = error.message?.includes("full")
      ? "รอบนี้เต็มแล้ว (หรือรอบถูกปิด/เป็นวันที่ผ่านมาแล้ว)"
      : `จองไม่สำเร็จ: ${error.message}`;
    redirect(back({ error: msg }));
  }

  // ชื่อเล่นไทย (migration 023) — เก็บแยกหลัง RPC เหมือนฝั่งฟอร์มลูกค้า
  if (s("nickname_th")) {
    await supabase
      .from("shoot_bookings")
      .update({ nickname_th: s("nickname_th") })
      .eq("id", bookingId);
  }

  // แอดมินจองแทน = ตรวจการจ่ายเงินแล้ว → อนุมัติทันที + เก็บข้อมูลเพิ่ม
  await supabase
    .from("shoot_bookings")
    .update({
      status: "approved",
      gender: s("gender"),
      dob: s("dob"),
      nationality: s("nationality"),
    })
    .eq("id", bookingId);

  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/admin/shoots");
  revalidatePath("/booking");
  redirect(back({ added: "1" }));
}

// ย้ายรอบเวลา / เปลี่ยนแพ็กเกจของการจองที่มีอยู่ (ลูกค้าขอเลื่อน)
// — เช็คที่นั่งปลายทางก่อนย้าย (ไม่นับตัวเองซ้ำ) และเช็คว่ารอบนั้นเปิดอยู่
export async function moveBooking(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  const toHour = String(formData.get("hour") ?? "");
  const toPkg = String(formData.get("package") ?? "");
  const back = (extra: Record<string, string>) =>
    backToDay(dayId, formData, extra);

  const validHours: readonly string[] = BOOKING.hours;
  if (!validHours.includes(toHour) || !(toPkg in BOOKING.packages)) {
    redirect(back({ error: "รอบเวลาหรือแพ็กเกจไม่ถูกต้อง" }));
  }

  const { data: current } = await supabase
    .from("shoot_bookings")
    .select("hour, package, status")
    .eq("id", id)
    .maybeSingle();
  if (!current) redirect(back({ error: "ไม่พบการจองนี้" }));
  if (current.hour === toHour && current.package === toPkg) {
    redirect(back({ moved: "1" })); // ไม่ได้เปลี่ยนอะไร
  }

  // รอบปลายทางเปิดรับอยู่ไหม
  const { data: day } = await supabase
    .from("shoot_days")
    .select("slots")
    .eq("id", dayId)
    .maybeSingle();
  const slot = ((day?.slots ?? {}) as Record<string, Record<string, boolean>>)[toHour];
  const photoOpen = slot?.photo_open ?? true;
  const videoOpen = slot?.video_open ?? true;

  // นับที่นั่งปลายทาง โดยไม่นับใบนี้ (กันนับซ้ำตอนย้ายภายในรอบเดิม)
  const { data: others } = await supabase
    .from("shoot_bookings")
    .select("id, package")
    .eq("shoot_day_id", dayId)
    .eq("hour", toHour)
    .not("status", "in", `(${BOOKING_FREED_STATUSES.join(",")})`)
    .neq("id", id);
  const photoUsed = (others ?? []).length;
  const videoUsed = (others ?? []).filter((b) => b.package === "A").length;

  if (!photoOpen || photoUsed >= BOOKING.photoCap) {
    redirect(
      back({ error: `ย้ายไม่ได้ — รอบ ${toHour} น. เต็มหรือถูกปิดอยู่` }),
    );
  }
  if (toPkg === "A" && (!videoOpen || videoUsed >= BOOKING.videoCap)) {
    redirect(
      back({ error: `ย้ายไม่ได้ — ห้องวิดีโอรอบ ${toHour} น. เต็มหรือถูกปิดอยู่` }),
    );
  }

  const { error } = await supabase
    .from("shoot_bookings")
    .update({ hour: toHour, package: toPkg })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/shoots/${dayId}`);
  revalidatePath("/admin/shoots");
  revalidatePath("/booking");
  redirect(back({ moved: "1" }));
}

// ลบการจองรายคน (เช่น รายการที่แอดมินสร้างไว้เทส) — คืนที่นั่งให้รอบนั้นด้วย
// ⚠️ กู้คืนไม่ได้ → ต้องผ่านรหัสยืนยันชั้นที่ 2
export async function deleteBooking(formData: FormData) {
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(
      backToDay(dayId, formData, {
        error: "รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบการจอง",
      }),
    );
  }

  // ลบสลิปออกจาก storage ก่อน (ไม่งั้นไฟล์ค้าง)
  const { data: b } = await supabase
    .from("shoot_bookings")
    .select("slip_path")
    .eq("id", id)
    .maybeSingle();
  if (b?.slip_path) {
    await supabase.storage.from("booking-slips").remove([b.slip_path]);
  }

  const { error } = await supabase.from("shoot_bookings").delete().eq("id", id);
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
      // ฟอร์มจองเก็บชื่อเล่นทั้งไทยและอังกฤษแล้ว (migration 023) → ลงช่องให้ตรงกัน
      // ของเก่าที่จองก่อนหน้านั้นไม่มี nickname_th → ใช้ชื่ออังกฤษไปก่อนเหมือนเดิม
      nickname_en: b.nickname,
      nickname_th: b.nickname_th || b.nickname || b.full_name,
      gender: b.gender ?? null,
      dob: b.dob ?? null,
      nationality: b.nationality ?? null,
      // ถ้าจองผ่าน LINE (เก็บ line_user_id ไว้) → ผูกโปรไฟล์ให้แม่อัตโนมัติ
      // → โผล่ในหน้า "โปรไฟล์ของฉัน" แก้ไข/อัพรูปเองได้ทันที ไม่ต้องส่งลิงก์
      line_user_id: b.line_user_id ?? null,
      line_display_name: b.line_display_name ?? null,
      line_picture_url: b.line_picture_url ?? null,
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
