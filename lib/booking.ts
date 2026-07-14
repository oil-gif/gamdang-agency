import "server-only";
import { BOOKING } from "@/lib/constants";
import { supabase } from "@/lib/supabase/server";

// คำนวณ availability ต่อ (วัน, ชั่วโมง, แพกเกจ) — กฎหัวใจของระบบ:
// ทั้ง A และ B กินที่ห้อง Photo · เฉพาะ A กินที่ห้อง Video เพิ่ม
// pending + approved ถือที่นั่ง · rejected คืนที่ · หน้าเว็บเห็นแค่ boolean
// ไม่เห็นจำนวน (จำนวนเป็นของ admin เท่านั้น)

export type SlotToggle = { photo_open?: boolean; video_open?: boolean };
export type SlotCounts = { photo: number; video: number };

export function slotOpen(slots: Record<string, SlotToggle>, hour: string) {
  const s = slots?.[hour] ?? {};
  return {
    photo: s.photo_open !== false,
    video: s.video_open !== false,
  };
}

export function availability(
  slots: Record<string, SlotToggle>,
  counts: Record<string, SlotCounts>,
) {
  const A: Record<string, boolean> = {};
  const B: Record<string, boolean> = {};
  for (const hour of BOOKING.hours) {
    const open = slotOpen(slots, hour);
    const c = counts[hour] ?? { photo: 0, video: 0 };
    const photoOk = open.photo && c.photo < BOOKING.photoCap;
    const videoOk = open.video && c.video < BOOKING.videoCap;
    B[hour] = photoOk;
    A[hour] = photoOk && videoOk;
  }
  return { A, B };
}

// นับที่นั่งที่ถูกจองต่อชั่วโมงของรอบหนึ่ง (pending+approved)
export async function getSlotCounts(shootDayId: string) {
  const { data } = await supabase
    .from("shoot_bookings")
    .select("hour, package")
    .eq("shoot_day_id", shootDayId)
    .neq("status", "rejected");
  const counts: Record<string, SlotCounts> = {};
  for (const b of data ?? []) {
    counts[b.hour] ??= { photo: 0, video: 0 };
    counts[b.hour].photo += 1;
    if (b.package === "A") counts[b.hour].video += 1;
  }
  return counts;
}

// label วันแบบไทย พ.ศ. เช่น "26 กรกฎาคม 2569"
export function thaiDateLabel(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// รอบถ่ายที่เปิดจอง (published + ยังไม่ผ่านวัน) พร้อม availability ต่อแพกเกจ
// — payload เดียวขับเคลื่อน wizard ทั้งตัว (เหมือน dates_js ของระบบเดิม)
export async function getPublicShootDates() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: days, error } = await supabase
    .from("shoot_days")
    .select("*")
    .eq("status", "published")
    .gte("shoot_date", today)
    .order("shoot_date", { ascending: true });
  if (error) throw new Error(error.message);

  return Promise.all(
    (days ?? []).map(async (d) => {
      const counts = await getSlotCounts(d.id);
      return {
        id: d.id,
        shoot_date: d.shoot_date,
        label: thaiDateLabel(d.shoot_date),
        location: d.location,
        details: d.details,
        avail: availability(d.slots ?? {}, counts),
      };
    }),
  );
}
