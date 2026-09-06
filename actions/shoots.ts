"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { thaiDateLabel } from "@/lib/booking";
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
  for (const key of ["bs", "bpage", "bq"]) {
    const v = incoming.get(key);
    if (v) p.set(key, v);
  }
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  const qs = p.toString();
  return `/admin/shoots/${dayId}${qs ? `?${qs}` : ""}#queue`;
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
      "id, status, full_name, nickname, nickname_th, phone, line_id, line_user_id, hour, package, created_at, shoot_day_id, shoot_day:shoot_days(id, shoot_date, location)",
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
    .select("full_name, nickname, hour, package, line_user_id, shoot_day:shoot_days(shoot_date, location)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const day = b.shoot_day as any;
  const pkg = BOOKING.packages[b.package as keyof typeof BOOKING.packages];
  const name = [b.full_name, b.nickname ? `(${b.nickname})` : ""]
    .filter(Boolean)
    .join(" ");

  return {
    lineUserId: b.line_user_id as string | null,
    text: [
      "✅ แก้มแดง ยืนยันรอบถ่ายโปรไฟล์",
      name,
      "",
      `วันถ่าย: ${day ? thaiDateLabel(day.shoot_date) : "-"}${day?.location ? ` · ${day.location}` : ""}`,
      `รอบ: ${b.hour} น. · ${pkg ? `${pkg.name} (${pkg.subtitle})` : b.package}`,
      "",
      "ใกล้วันถ่ายทีมงานจะส่งแจ้งเตือนอีกครั้งค่ะ",
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
    await pushLineMessage(built.lineUserId, [
      { type: "text", text: built.text },
    ]);
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
  const built = await buildBookingConfirmText(id);
  if (!built?.lineUserId) {
    redirect(
      backToDay(dayId, formData, {
        error: "คนนี้ไม่ได้จองผ่าน LINE — ใช้ปุ่มคัดลอกข้อความแล้วส่งเองค่ะ",
      }),
    );
  }
  // ห้ามให้ error หลุดออกไป ไม่งั้น Next.js ขึ้นหน้า "This page couldn't load"
  // เต็มจอ แทนที่จะบอกแอดมินว่าส่งไม่ได้เพราะอะไร
  let fail: LineFailReason | null = null;
  try {
    await pushLineMessage(built.lineUserId!, [
      { type: "text", text: built.text },
    ]);
  } catch (e) {
    console.error("resend booking confirm failed", e);
    fail = classifyLineError(e);
  }

  revalidatePath(`/admin/shoots/${dayId}`);
  redirect(
    backToDay(dayId, formData, fail ? { linefail: fail } : { linesent: "1" }),
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
