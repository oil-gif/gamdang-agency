"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { computeTierAndFollowers } from "@/lib/tier";
import { CATEGORIES, ETHNICITIES, TALENTS_PAGE_SIZE } from "@/lib/constants";
import { yearsAgo } from "@/lib/age";
import { getTalentSession } from "@/lib/auth/talent-session";
import { verifyDangerCode } from "@/lib/danger";

// 4 ช่องบังคับของคอมการ์ด (ตรงกับ REQUIRED_SLOTS ใน lib/compcard.ts)
const REQUIRED_SLOT_KEYS = ["headshot", "half", "lifestyle", "full"] as const;

// รูปตัวแทนของ talent สำหรับการ์ด/ลิสต์ — เลือก "รูปหลัก → หน้าตรง" ก่อนเสมอ
// (compcard_slots.single = รูปหลัก, headshot = หน้าตรง) แล้วค่อย fallback เป็น
// gallery รูปแรก / คอมการ์ด · กันเคสหยิบรูปเต็มตัว/รูปคอมการ์ดมาเป็นรูปตัวแทน
function pickPrimaryPhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: { compcard_slots?: Record<string, any> | null },
  photos: { kind: string; storage_path: string }[],
): string | null {
  const slots = (t.compcard_slots ?? {}) as Record<string, string>;
  const gallery = photos.find((p) => p.kind === "gallery")?.storage_path ?? null;
  const compcard = photos.find((p) => p.kind === "compcard")?.storage_path ?? null;
  return slots.single ?? slots.headshot ?? gallery ?? compcard ?? null;
}

export type TalentFilters = {
  q?: string;
  rating?: "rated" | "unrated"; // ⭐ มีดาวแล้ว / ยังไม่ได้ให้ดาว
  newDays?: number; // สมัครเข้ามาใหม่ภายใน N วัน
  line?: "linked" | "unlinked"; // ผูก LINE แล้ว / ยังไม่ผูก
  role?: "model" | "influencer" | "ai";
  gender?: string;
  status?: string;
  tier?: string;
  category?: string;
  ethnicity?: string;
  minHeight?: number;
  maxHeight?: number;
  minAge?: number;
  maxAge?: number;
};

export async function getTalents(filters: TalentFilters = {}) {
  let query = supabase
    .from("talents")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `nickname_th.ilike.%${term}%,nickname_en.ilike.%${term}%,code.ilike.%${term}%`,
    );
  }
  if (filters.role === "model") query = query.eq("is_model", true);
  if (filters.role === "influencer") query = query.eq("is_influencer", true);
  if (filters.role === "ai") query = query.eq("is_ai_model", true);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.tier) query = query.eq("tier", filters.tier);
  if (filters.category) query = query.contains("categories", [filters.category]);
  if (filters.ethnicity) query = query.contains("ethnicities", [filters.ethnicity]);
  if (filters.minHeight) query = query.gte("height_cm", filters.minHeight);
  if (filters.maxHeight) query = query.lte("height_cm", filters.maxHeight);
  // Older = smaller (earlier) dob, so "at least minAge" means dob <= cutoff.
  if (filters.minAge) query = query.lte("dob", yearsAgo(filters.minAge));
  if (filters.maxAge) query = query.gte("dob", yearsAgo(filters.maxAge + 1));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// สำหรับหน้า list แบบการ์ด: talent + รูปตัวแทน (gallery แรก, fallback compcard)
// แบ่งหน้า (60/หน้า) — รองรับข้อมูลหลักหมื่นโดยไม่โหลดทั้งหมด
// (ไฟล์ "use server" export ได้แค่ async fn — ตัวเลขหน้าอยู่ใน lib/constants)
export async function getTalentsWithPhotos(
  filters: TalentFilters = {},
  page = 1,
) {
  let query = supabase
    .from("talents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `nickname_th.ilike.%${term}%,nickname_en.ilike.%${term}%,code.ilike.%${term}%`,
    );
  }
  if (filters.role === "model") query = query.eq("is_model", true);
  if (filters.role === "influencer") query = query.eq("is_influencer", true);
  if (filters.role === "ai") query = query.eq("is_ai_model", true);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.tier) query = query.eq("tier", filters.tier);
  if (filters.category) query = query.contains("categories", [filters.category]);
  if (filters.ethnicity) query = query.contains("ethnicities", [filters.ethnicity]);
  if (filters.minHeight) query = query.gte("height_cm", filters.minHeight);
  if (filters.maxHeight) query = query.lte("height_cm", filters.maxHeight);
  if (filters.minAge) query = query.lte("dob", yearsAgo(filters.minAge));
  if (filters.maxAge) query = query.gte("dob", yearsAgo(filters.maxAge + 1));
  if (filters.rating === "rated") query = query.gt("rating", 0);
  if (filters.rating === "unrated") query = query.eq("rating", 0);
  if (filters.newDays) {
    const since = new Date(Date.now() - filters.newDays * 86400000);
    query = query.gte("created_at", since.toISOString());
  }
  if (filters.line === "linked") query = query.not("line_user_id", "is", null);
  if (filters.line === "unlinked") query = query.is("line_user_id", null);

  const from = (page - 1) * TALENTS_PAGE_SIZE;
  const { data: talents, count, error } = await query.range(
    from,
    from + TALENTS_PAGE_SIZE - 1,
  );
  if (error) throw new Error(error.message);
  if (!talents || talents.length === 0)
    return { talents: [], total: count ?? 0 };

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return {
    total: count ?? 0,
    talents: talents.map((t) => {
      const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
      return { ...t, photo_path: pickPrimaryPhoto(t, mine) };
    }),
  };
}

export async function getTalent(id: string) {
  const { data, error } = await supabase
    .from("talents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// หน้า /talents สาธารณะ: เรียงเพื่อความสวย+ขายลูกค้า —
// มีรูปก่อน → follower มากสุดก่อน → ใหม่สุด (คนไม่มีรูปไปท้าย)
// จำนวน talent ไม่เยอะ (หลักร้อย) ดึงทั้งหมดแล้วเรียง/แบ่งหน้าใน JS ได้สบาย
// ⚠️ PostgREST คืนแถวได้สูงสุด 1000 แถวต่อ 1 คำสั่ง แต่ talent_photos โตเกิน
// 1000 แถวไปแล้ว (1557 แถว ณ 2026-08-11) — ยิง .in() ทีเดียวจะได้รูปไม่ครบ
// คนที่รูปตกขอบจะถูกมองว่า "ไม่มีรูป" แล้วหายจากหน้า /talents ทั้งที่มีรูป
// และหายไม่ซ้ำหน้าเดิมทุกครั้ง เพราะ display_order ซ้ำกันเยอะ ลำดับเลยไม่คงที่
// (เจอตอนทำแถบสถิติ: โหลดรอบนึงได้ 407 คน อีกรอบเหลือ 209 คน)
// → แบ่งยิงทีละก้อน ก้อนละ 150 คน (~500 แถว) ให้ไม่มีทางชนเพดาน
const PHOTO_ID_BATCH = 150;

type TalentPhotoRow = {
  talent_id: string;
  kind: string;
  storage_path: string;
  display_order: number | null;
};

async function fetchTalentPhotos(ids: string[]): Promise<TalentPhotoRow[]> {
  const out: TalentPhotoRow[] = [];
  for (let i = 0; i < ids.length; i += PHOTO_ID_BATCH) {
    const { data } = await supabase
      .from("talent_photos")
      .select("talent_id, kind, storage_path, display_order")
      .in("talent_id", ids.slice(i, i + PHOTO_ID_BATCH))
      .order("display_order", { ascending: true });
    if (data) out.push(...(data as TalentPhotoRow[]));
  }
  return out;
}

export async function getPublicTalents(filters: TalentFilters = {}, page = 1) {
  let query = supabase.from("talents").select("*").eq("status", "active");

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `nickname_th.ilike.%${term}%,nickname_en.ilike.%${term}%,code.ilike.%${term}%`,
    );
  }
  if (filters.role === "model") query = query.eq("is_model", true);
  if (filters.role === "influencer") query = query.eq("is_influencer", true);
  if (filters.role === "ai") query = query.eq("is_ai_model", true);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.tier) query = query.eq("tier", filters.tier);
  if (filters.category) query = query.contains("categories", [filters.category]);
  if (filters.ethnicity) query = query.contains("ethnicities", [filters.ethnicity]);
  if (filters.minHeight) query = query.gte("height_cm", filters.minHeight);
  if (filters.maxHeight) query = query.lte("height_cm", filters.maxHeight);
  if (filters.minAge) query = query.lte("dob", yearsAgo(filters.minAge));
  if (filters.maxAge) query = query.gte("dob", yearsAgo(filters.maxAge + 1));

  const { data: talents, error } = await query;
  if (error) throw new Error(error.message);
  if (!talents || talents.length === 0) return { talents: [], total: 0 };

  const photos = await fetchTalentPhotos(talents.map((t) => t.id));

  const withPhoto = talents
    // ซ่อนคนที่ขอลบประวัติออกจากหน้าสาธารณะทันที (defensive: ถ้ายังไม่รัน
    // migration 016 field จะเป็น undefined → ไม่กรองใคร)
    .filter(
      (t) => !(t as { deletion_requested_at?: string | null }).deletion_requested_at,
    )
    .map((t) => {
      const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
      const slots = (t.compcard_slots ?? {}) as Record<string, string>;
      // "รูปพอร์ตเทรต" = รูปเดี่ยวจริงๆ (ไม่ใช่รูปคอมการ์ดย่อ ซึ่งขึ้นการ์ดแล้วไม่สวย)
      const portrait =
        slots.single ??
        slots.headshot ??
        mine.find((p) => p.kind === "gallery")?.storage_path ??
        null;
      const compcard = mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
      return {
        ...t,
        // มีรูปเดี่ยวใช้รูปเดี่ยว · ไม่มีก็ใช้คอมการ์ดไปก่อน (แต่จะถูกจัดไว้ท้ายสุด)
        photo_path: portrait ?? compcard,
        _hasPortrait: portrait ? 1 : 0,
        _hasCompcard: !!compcard,
        _slotsDone: REQUIRED_SLOT_KEYS.filter((k) => slots[k]).length,
      };
    })
    // ซ่อนเฉพาะคนที่ไม่มีรูปเลย (การ์ดจะเป็นช่องเทา ไม่มีอะไรให้ดู)
    // — คนที่มีแต่คอมการ์ดยังโชว์ แต่ไปอยู่ท้ายสุด
    .filter((t) => t.photo_path);

  // เคยมาถ่ายกับแก้มแดงจริง (เช็คอินหน้างานแล้ว) — ใช้เป็นคะแนนความน่าเชื่อถือ
  const shotIds = new Set<string>();
  if (withPhoto.length > 0) {
    const { data: shot } = await supabase
      .from("shoot_bookings")
      .select("talent_id")
      .not("talent_id", "is", null)
      .not("arrived_at", "is", null)
      .in(
        "talent_id",
        withPhoto.map((t) => t.id),
      );
    for (const b of shot ?? []) if (b.talent_id) shotIds.add(b.talent_id);
  }

  // คะแนน "ความครบ/พร้อมเสนอ" 0-3: มีคอมการ์ด + อัพรูปครบ 4 ช่อง + เคยมาถ่ายจริง
  const quality = (t: (typeof withPhoto)[number]) =>
    (t._hasCompcard ? 1 : 0) +
    (t._slotsDone >= REQUIRED_SLOT_KEYS.length ? 1 : 0) +
    (shotIds.has(t.id) ? 1 : 0);

  const rating = (t: { rating?: number | null }) => t.rating ?? 0;
  const followers = (t: { max_followers?: number | null }) => t.max_followers ?? 0;
  const newest = (a: { created_at: string }, b: { created_at: string }) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  // คนมีรูปเดี่ยวขึ้นก่อนเสมอ — คนที่มีแต่คอมการ์ดไปต่อท้ายสุด (ยังโชว์อยู่)
  const portraitFirst = (
    a: { _hasPortrait: number },
    b: { _hasPortrait: number },
  ) => b._hasPortrait - a._hasPortrait;

  if (filters.role === "influencer") {
    // แท็บ Influencer: รูปเดี่ยวก่อน → ผู้ติดตามมากสุด → ดาว → ความครบ → ใหม่สุด
    withPhoto.sort(
      (a, b) =>
        portraitFirst(a, b) ||
        followers(b) - followers(a) ||
        rating(b) - rating(a) ||
        quality(b) - quality(a) ||
        newest(a, b),
    );
  } else {
    // แท็บอื่น (All/Model/AI): รูปเดี่ยวก่อน → ดาว → ความครบ → follower → ใหม่สุด
    withPhoto.sort(
      (a, b) =>
        portraitFirst(a, b) ||
        rating(b) - rating(a) ||
        quality(b) - quality(a) ||
        followers(b) - followers(a) ||
        newest(a, b),
    );
  }

  const total = withPhoto.length;
  const from = (page - 1) * TALENTS_PAGE_SIZE;
  return { talents: withPhoto.slice(from, from + TALENTS_PAGE_SIZE), total };
}

// The approval queue: everyone waiting for admin review (mostly LINE
// self-applicants). Includes each talent's comp card path so the queue can
// show a thumbnail without a second round-trip per row.
export async function getPendingTalents() {
  const { data: talents, error } = await supabase
    .from("talents")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!talents || talents.length === 0) return [];

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return (
    talents
      .map((t) => {
        const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
        return { ...t, compcard_path: pickPrimaryPhoto(t, mine) };
      })
      // ซ่อน "สมัครค้าง" ที่ยังไม่อัพรูปเลย ออกจากคิวอนุมัติ — ยังอยู่ในระบบ
      // (สถานะ pending) ถ้ากลับมาอัพรูปเสร็จจะโผล่ในคิวให้อนุมัติเอง
      .filter((t) => t.compcard_path)
  );
}

// สถิติ dashboard แบบ count-only (ไม่ดึงข้อมูลทั้งตาราง — เร็วแม้หมื่น record)
export async function getTalentCounts() {
  const count = async (status?: string) => {
    let q = supabase.from("talents").select("id", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [total, active] = await Promise.all([count(), count("active")]);
  return { total, active };
}

// ตัวเลขโชว์บนแถบสถิติหน้า /talents (หน้าที่ลูกค้าเปิดดู)
//
// ⚠️ ต้องนับด้วย "กติกาการมองเห็น" ชุดเดียวกับ getPublicTalents เป๊ะๆ คือ
// active + ไม่ได้ขอลบประวัติ + มีรูปให้ดู (รูปเดี่ยวหรือคอมการ์ด) ไม่งั้นเลข
// บนแถบจะมากกว่าจำนวนการ์ดที่กดดูได้จริง — บนหน้าที่ลูกค้าเปิด เลขไม่ตรง
// = เสียความน่าเชื่อถือ (เคยพลาดมาแล้ว: นับดิบได้ 453 แต่ดูได้จริง 407)
// แก้กติกาที่ getPublicTalents เมื่อไหร่ ต้องแก้ที่นี่ด้วย
export async function getPublicTalentCounts() {
  const { data: talents } = await supabase
    .from("talents")
    .select(
      "id, is_model, is_influencer, is_ai_model, compcard_slots, deletion_requested_at",
    )
    .eq("status", "active");
  const live = (talents ?? []).filter((t) => !t.deletion_requested_at);
  if (live.length === 0) return { total: 0, model: 0, influencer: 0, ai: 0 };

  const photos = await fetchTalentPhotos(live.map((t) => t.id));
  const hasPhotoRow = new Set(
    photos
      .filter((p) => p.kind === "gallery" || p.kind === "compcard")
      .map((p) => p.talent_id),
  );

  const visible = live.filter((t) => {
    const slots = (t.compcard_slots ?? {}) as Record<string, string>;
    return Boolean(slots.single || slots.headshot) || hasPhotoRow.has(t.id);
  });

  return {
    total: visible.length,
    model: visible.filter((t) => t.is_model).length,
    influencer: visible.filter((t) => t.is_influencer).length,
    ai: visible.filter((t) => t.is_ai_model).length,
  };
}

export async function getPendingCount() {
  // นับเฉพาะ "รออนุมัติที่อัพรูปแล้ว" ให้ตรงกับคิวอนุมัติ (ซ่อนสมัครค้าง)
  const { data: pending, error } = await supabase
    .from("talents")
    .select("id")
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  if (!pending || pending.length === 0) return 0;
  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id")
    .in(
      "talent_id",
      pending.map((t) => t.id),
    );
  const withPhoto = new Set((photos ?? []).map((p) => p.talent_id));
  return pending.filter((t) => withPhoto.has(t.id)).length;
}

// ค้นหา talent สำหรับ combobox (photo inbox ฯลฯ) — จำกัด 20 ผลลัพธ์
// รองรับข้อมูลหลักหมื่นคนโดยไม่ต้องโหลดรายชื่อทั้งหมด
export async function searchTalents(q: string) {
  const term = q.trim().replace(/[%,]/g, "");
  let query = supabase
    .from("talents")
    .select("id, code, nickname_th, nickname_en")
    .order("code", { ascending: true })
    .limit(20);
  if (term) {
    query = query.or(
      `nickname_th.ilike.%${term}%,nickname_en.ilike.%${term}%,code.ilike.%${term}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Cleanup: talent ที่ไม่มีการอัพเดทเลย (ทั้งฝั่งเราและฝั่ง talent) เกิน 3 ปี
// — updated_at เด้งอัตโนมัติทุกครั้งที่มีการแก้ไข (trigger ใน schema)
export async function getStaleTalents() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 3);
  const { data, error } = await supabase
    .from("talents")
    .select("id, code, nickname_th, nickname_en, status, updated_at")
    .lt("updated_at", cutoff.toISOString())
    .order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// "เก็บไว้" — bump updated_at ให้เริ่มนับ 3 ปีใหม่
export async function keepTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("talents")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ลบจากหน้า cleanup (ไม่ redirect เหมือน deleteTalent)
export async function deleteStaleTalent(formData: FormData) {
  const id = String(formData.get("id"));
  // ⚠️ ลบประวัติถาวร — ต้องมีรหัสยืนยัน
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(`/admin?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบ")}`);
  }
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/talents");
}

export async function approveTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("talents")
    .update({ status: "active" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/talents");
}

export async function rejectTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("talents")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/talents");
}

function num(formData: FormData, key: string) {
  const raw = formData.get(key);
  const n = Number(raw);
  return Number.isFinite(n) && raw !== "" ? n : 0;
}

function str(formData: FormData, key: string) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
}

// เติม https:// ให้ลิงก์ที่ไม่มี scheme (คนกรอกมักลืม)
function normUrl(v: string | null) {
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
// textarea หลายบรรทัด → array ลิงก์ (สูงสุด 5, เติม https ให้)
function parseLinks(v: string | null): string[] {
  if (!v) return [];
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((l) => normUrl(l)!)
    .filter(Boolean);
}

export async function saveTalent(formData: FormData) {
  const id = str(formData, "id");
  const backTo = id ? `/admin/talents/${id}` : "/admin/talents/new";

  const gender = str(formData, "gender");
  const dob = str(formData, "dob");
  const nicknameEn = str(formData, "nickname_en");
  if (!nicknameEn || !gender || !dob) {
    redirect(
      `${backTo}?error=${encodeURIComponent("กรุณากรอกชื่อเล่น (English) เพศ และวันเกิด (บังคับ)")}`,
    );
  }

  const followers = {
    ig: num(formData, "ig_followers"),
    tiktok: num(formData, "tiktok_followers"),
    youtube: num(formData, "youtube_followers"),
    facebook: num(formData, "facebook_followers"),
    lemon8: num(formData, "lemon8_followers"),
  };
  const { max_followers, tier } = computeTierAndFollowers(followers);

  const categories = formData
    .getAll("categories")
    .map(String)
    .filter((c) => (CATEGORIES as readonly string[]).includes(c));

  const ethnicityValues = ETHNICITIES.map((e) => e.value) as readonly string[];
  const ethnicities = formData
    .getAll("ethnicities")
    .map(String)
    .filter((e) => ethnicityValues.includes(e));

  const payload = {
    nickname_th: str(formData, "nickname_th"),
    nickname_en: str(formData, "nickname_en"),
    full_name: str(formData, "full_name"),
    gender,
    dob,
    ethnicities,
    height_cm: formData.get("height_cm") ? num(formData, "height_cm") : null,
    weight_kg: formData.get("weight_kg") ? num(formData, "weight_kg") : null,
    measurements: str(formData, "measurements"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    contact_line_or_whatsapp: str(formData, "contact_line_or_whatsapp"),
    note: str(formData, "note"),
    is_model: formData.get("is_model") === "on",
    is_influencer: formData.get("is_influencer") === "on",
    // AI Model เป็นของ admin เท่านั้น — saveTalentSelf ไม่มี field นี้โดยตั้งใจ
    is_ai_model: formData.get("is_ai_model") === "on",
    character: str(formData, "character"),
    // ผลงาน/คลิปแนะนำตัว (admin กรอกเอง — casting form ของ talent ก็ sync มาช่องนี้)
    portfolio_links: (str(formData, "portfolio_links") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`))
      .slice(0, 5),
    intro_video_url: str(formData, "intro_video_url"),
    nationality: str(formData, "nationality"),
    status: str(formData, "status") ?? "pending",
    ig_handle: str(formData, "ig_handle"),
    ig_followers: followers.ig,
    tiktok_handle: str(formData, "tiktok_handle"),
    tiktok_followers: followers.tiktok,
    youtube_handle: str(formData, "youtube_handle"),
    youtube_followers: followers.youtube,
    facebook_handle: str(formData, "facebook_handle"),
    facebook_followers: followers.facebook,
    lemon8_handle: str(formData, "lemon8_handle"),
    lemon8_followers: followers.lemon8,
    max_followers,
    tier,
    categories,
  };

  if (id) {
    // แอดมินแก้รหัสเองได้ (ไว้โอนรหัสจากระบบเก่า) — เช็คซ้ำก่อน
    const code = str(formData, "code");
    if (code) {
      const { data: dup } = await supabase
        .from("talents")
        .select("id")
        .eq("code", code)
        .neq("id", id)
        .maybeSingle();
      if (dup) {
        redirect(`${backTo}?error=${encodeURIComponent(`รหัส ${code} ถูกใช้แล้ว กรุณาใช้รหัสอื่น`)}`);
      }
    }
    const { error } = await supabase
      .from("talents")
      .update(code ? { ...payload, code } : payload)
      .eq("id", id);
    // อย่าโยน error ดิบ (จะกลายเป็นหน้าขาว "server error") — เด้งกลับฟอร์ม
    // พร้อมข้อความแทน
    if (error) {
      redirect(`${backTo}?error=${encodeURIComponent(`บันทึกไม่สำเร็จ: ${error.message}`)}`);
    }
    revalidatePath("/admin/talents");
    revalidatePath(`/admin/talents/${id}`);
    // อยู่หน้าโปรไฟล์เดิม — เดิมเด้งกลับไปหน้ารายการ ทำให้แอดมินต้องไล่หาคนนั้นใหม่
    // ทุกครั้งที่แก้ (พี่เจ้าของแจ้ง 2026-08-21) · คง ?from= ไว้ให้ปุ่มย้อนกลับทำงานเหมือนเดิม
    const fromParam = str(formData, "from");
    const back = `/admin/talents/${id}?saved=1${
      fromParam ? `&from=${encodeURIComponent(fromParam)}` : ""
    }`;
    redirect(back);
  }

  const { data: created, error } = await supabase
    .from("talents")
    .insert({ ...payload, source: "admin" })
    .select("id")
    .single();
  if (error || !created) {
    redirect(
      `${backTo}?error=${encodeURIComponent(`บันทึกไม่สำเร็จ: ${error?.message ?? "unknown"}`)}`,
    );
  }

  revalidatePath("/admin/talents");
  // Go straight to the edit page so photos can be added right away.
  redirect(`/admin/talents/${created.id}`);
}

// ===== LIFF self-service: 1 LINE account (แม่) จัดการหลายโปรไฟล์ (ลูก) =====

// โปรไฟล์ทั้งหมดของบัญชี LINE นี้ + รูปตัวแทน — สำหรับหน้า /apply/profiles
export async function getMyTalents() {
  const session = await getTalentSession();
  if (!session) return [];
  const { data: talents } = await supabase
    .from("talents")
    .select("*")
    .eq("line_user_id", session.lineUserId)
    .order("created_at", { ascending: true });
  if (!talents || talents.length === 0) return [];

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return talents.map((t) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
    return { ...t, photo_path: pickPrimaryPhoto(t, mine) };
  });
}

// โหลด talent พร้อมเช็คว่าเป็นของบัญชี LINE นี้จริง (กันแก้ข้ามบัญชี)
// คืน null ถ้าไม่ใช่เจ้าของ
export async function getOwnedTalent(talentId: string) {
  const session = await getTalentSession();
  if (!session) return null;
  const { data } = await supabase
    .from("talents")
    .select("*")
    .eq("id", talentId)
    .eq("line_user_id", session.lineUserId)
    .maybeSingle();
  return data ?? null;
}

// Same shape as saveTalent(), but for the LIFF self-service flow: the
// talent id comes from formData but is re-checked against the session's
// LINE account (one parent can't edit another parent's kid), and
// status/source are never in the payload so a talent can't self-approve.
export async function saveTalentSelf(formData: FormData) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");

  const talentId = str(formData, "talent_id");
  const owned = talentId ? await getOwnedTalent(talentId) : null;
  // ส่ง talent_id มาแต่ไม่ใช่ของบัญชีนี้ → กันแก้ข้ามบัญชี
  if (talentId && !owned) redirect("/apply/profiles");

  // ไม่มี owned = โปรไฟล์ใหม่ (ยังไม่เคยสร้าง row) — สร้างตอนกดบันทึกเท่านั้น
  const isNew = !owned;
  const backTo = owned ? `/apply/edit?id=${owned.id}` : "/apply/edit";
  const sep = backTo.includes("?") ? "&" : "?";

  const nicknameEn = str(formData, "nickname_en");
  const gender = str(formData, "gender");
  const dob = str(formData, "dob");
  const phone = str(formData, "phone");
  const isModel = formData.get("is_model") === "on";
  const isInfluencer = formData.get("is_influencer") === "on";
  // ต้องเลือกอย่างน้อย 1 บทบาท
  if (!isModel && !isInfluencer) {
    redirect(
      `${backTo}${sep}error=${encodeURIComponent("เลือกอย่างน้อย 1 บทบาท: Model หรือ Influencer")}`,
    );
  }
  // ข้อมูลพื้นฐานบังคับทุกคน
  if (!nicknameEn || !gender || !dob || !phone) {
    redirect(
      `${backTo}${sep}error=${encodeURIComponent("กรุณากรอกให้ครบ: ชื่อเล่น (English) เพศ วันเกิด และเบอร์โทร")}`,
    );
  }
  // สูง/หนัก/สัญชาติ บังคับเฉพาะ Model (ขึ้นบน Comp Card + การ์ด Model) —
  // Influencer ล้วนไม่ต้องกรอก เพื่อให้สมัครง่ายขึ้น
  const heightCm = str(formData, "height_cm");
  const weightKg = str(formData, "weight_kg");
  const nationality = str(formData, "nationality");
  if (isModel && (!heightCm || !weightKg || !nationality)) {
    redirect(
      `${backTo}${sep}error=${encodeURIComponent("Model ต้องกรอก ส่วนสูง น้ำหนัก และสัญชาติ ด้วยค่ะ")}`,
    );
  }

  const followers = {
    ig: num(formData, "ig_followers"),
    tiktok: num(formData, "tiktok_followers"),
    youtube: num(formData, "youtube_followers"),
    facebook: num(formData, "facebook_followers"),
    lemon8: num(formData, "lemon8_followers"),
  };
  const { max_followers, tier } = computeTierAndFollowers(followers);

  const categories = formData
    .getAll("categories")
    .map(String)
    .filter((c) => (CATEGORIES as readonly string[]).includes(c));

  const ethnicityValues = ETHNICITIES.map((e) => e.value) as readonly string[];
  const ethnicities = formData
    .getAll("ethnicities")
    .map(String)
    .filter((e) => ethnicityValues.includes(e));

  const payload = {
    nickname_th: str(formData, "nickname_th"),
    nickname_en: str(formData, "nickname_en"),
    full_name: str(formData, "full_name"),
    gender,
    dob,
    ethnicities,
    height_cm: formData.get("height_cm") ? num(formData, "height_cm") : null,
    weight_kg: formData.get("weight_kg") ? num(formData, "weight_kg") : null,
    measurements: str(formData, "measurements"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    contact_line_or_whatsapp: str(formData, "contact_line_or_whatsapp"),
    note: str(formData, "note"),
    nationality: str(formData, "nationality"),
    is_model: formData.get("is_model") === "on",
    is_influencer: formData.get("is_influencer") === "on",
    ig_handle: str(formData, "ig_handle"),
    ig_followers: followers.ig,
    tiktok_handle: str(formData, "tiktok_handle"),
    tiktok_followers: followers.tiktok,
    youtube_handle: str(formData, "youtube_handle"),
    youtube_followers: followers.youtube,
    facebook_handle: str(formData, "facebook_handle"),
    facebook_followers: followers.facebook,
    lemon8_handle: str(formData, "lemon8_handle"),
    lemon8_followers: followers.lemon8,
    max_followers,
    tier,
    categories,
    // ผลงาน/คลิปแนะนำตัว — เก็บที่ตัว talent เพื่อส่งลูกค้าได้เลยตอนเสนองาน
    portfolio_links: parseLinks(str(formData, "portfolio_links")),
    intro_video_url: normUrl(str(formData, "intro_video_url")),
  };

  if (isNew) {
    // กันสร้างโปรไฟล์ซ้ำ: บัญชี LINE นี้มีโปรไฟล์ชื่อ (EN) เดียวกันอยู่แล้วหรือยัง
    // (เคสกดย้อนกลับมากรอกใหม่ แล้วเผลอสร้างโปรไฟล์ใหม่แทนที่จะแก้ของเดิม)
    const { data: dupName } = await supabase
      .from("talents")
      .select("id")
      .eq("line_user_id", session.lineUserId)
      .ilike("nickname_en", nicknameEn)
      .limit(1);
    if (dupName && dupName.length > 0) {
      redirect(
        `/apply/profiles?error=${encodeURIComponent(`คุณมีโปรไฟล์ชื่อ "${nicknameEn}" อยู่แล้วค่ะ — ถ้าจะแก้ไข กดที่การ์ดโปรไฟล์เดิมด้านล่าง · ถ้าเป็นคนละคน (เช่นลูกอีกคน) กรุณาใช้ชื่อที่ไม่ซ้ำกันนะคะ`)}`,
      );
    }

    // สร้าง row ใหม่ผูกกับบัญชี LINE นี้ (พร้อมข้อมูลที่กรอก) — pending รออนุมัติ
    const { data: created, error } = await supabase
      .from("talents")
      .insert({
        ...payload,
        line_user_id: session.lineUserId,
        line_display_name: session.lineName,
        line_picture_url: session.linePicture,
        source: "self",
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !created) {
      redirect(
        `/apply/edit?error=${encodeURIComponent("บันทึกไม่สำเร็จ กรุณาลองใหม่")}`,
      );
    }
    revalidatePath("/apply/profiles");
    // ไปขั้นตอน 2 (อัพโหลดรูปทำ Comp Card) ต่อทันที
    redirect(`/apply/edit?id=${created.id}&step=2&saved=1`);
  }

  const { error } = await supabase
    .from("talents")
    .update(payload)
    .eq("id", owned!.id);
  if (error) throw new Error(error.message);

  revalidatePath(backTo);
  redirect(`${backTo}&step=2&saved=1`);
}

// ผู้สมัคร Model ที่เลือก "มีคอมการ์ดแก้มแดงเดิม" — เก็บรหัสแก้มแดงเก่าที่กรอก
// (เช็คสิทธิ์ตามบัญชี LINE) · เขียนแบบ defensive เผื่อยังไม่ได้รัน migration 015
export async function saveLegacyCompcardCode(talentId: string, code: string) {
  const owned = await getOwnedTalent(talentId);
  if (!owned) return { ok: false as const, error: "forbidden" };
  const { error } = await supabase
    .from("talents")
    .update({ legacy_code: code.trim() || null })
    .eq("id", talentId);
  if (error) {
    // คอลัมน์ legacy_code ยังไม่มี (ยังไม่รัน migration 015) — ไม่ให้ flow พัง
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function deleteTalent(formData: FormData) {
  const id = String(formData.get("id"));
  // ⚠️ ลบประวัติถาวร — ต้องมีรหัสยืนยัน
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(
      `/admin/talents/${id}?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบโปรไฟล์")}`,
    );
  }
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/talents");
  redirect("/admin/talents");
}

// ===== ตรวจข้อมูลซ้ำ / ยังไม่เชื่อม LINE =====

// โปรไฟล์ที่น่าจะซ้ำกัน: ชื่อเล่น (ตัดช่องว่าง/พิมพ์เล็กใหญ่) + วันเกิด ตรงกัน
// — ไม่ใช้ "เบอร์โทรซ้ำ" เป็นเกณฑ์ เพราะแม่ 1 คนสมัครให้ลูกหลายคนใช้เบอร์เดียวกัน
export async function getDuplicateTalents() {
  const { data: talents } = await supabase
    .from("talents")
    .select(
      "id, code, nickname_en, nickname_th, dob, phone, status, line_user_id, created_at, rating, compcard_slots",
    )
    .order("created_at", { ascending: true });
  if (!talents) return [];

  const key = (t: (typeof talents)[number]) => {
    const n = (t.nickname_en || t.nickname_th || "").trim().toLowerCase();
    return n && t.dob ? `${n}|${t.dob}` : null;
  };
  const groups = new Map<string, typeof talents>();
  for (const t of talents) {
    const k = key(t);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  if (dupGroups.length === 0) return [];

  // ข้อมูลประกอบการตัดสินใจว่าจะเก็บใบไหน: จำนวนรูป + จำนวนงานที่เคยอยู่
  const ids = dupGroups.flat().map((t) => t.id);
  const [{ data: photos }, { data: pts }] = await Promise.all([
    supabase.from("talent_photos").select("talent_id, kind").in("talent_id", ids),
    supabase.from("project_talents").select("talent_id").in("talent_id", ids),
  ]);
  const photoCount = new Map<string, number>();
  const hasCompcard = new Set<string>();
  for (const p of photos ?? []) {
    photoCount.set(p.talent_id, (photoCount.get(p.talent_id) ?? 0) + 1);
    if (p.kind === "compcard") hasCompcard.add(p.talent_id);
  }
  const projectCount = new Map<string, number>();
  for (const r of pts ?? []) {
    if (r.talent_id)
      projectCount.set(r.talent_id, (projectCount.get(r.talent_id) ?? 0) + 1);
  }

  return dupGroups.map((g) => ({
    name: g[0].nickname_en || g[0].nickname_th || "",
    dob: g[0].dob as string,
    members: g.map((t) => ({
      ...t,
      photos: photoCount.get(t.id) ?? 0,
      hasCompcard: hasCompcard.has(t.id),
      projects: projectCount.get(t.id) ?? 0,
    })),
  }));
}

export async function getDuplicateCount() {
  const groups = await getDuplicateTalents();
  return groups.length;
}

// จำนวนคนที่ยังไม่ผูก LINE (แอดมินต้องส่งลิงก์เชื่อมให้)
export async function getUnlinkedCount() {
  const { count, error } = await supabase
    .from("talents")
    .select("id", { count: "exact", head: true })
    .is("line_user_id", null)
    .neq("status", "rejected");
  if (error) return 0;
  return count ?? 0;
}

// ลบโปรไฟล์ซ้ำ (จากหน้าตรวจข้อมูลซ้ำ) — ต้องผ่านรหัสยืนยันเหมือนลบถาวรอื่นๆ
export async function deleteDuplicateTalent(formData: FormData) {
  const id = String(formData.get("id"));
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(
      `/admin/duplicates?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบ")}`,
    );
  }
  const { data: photos } = await supabase
    .from("talent_photos")
    .select("storage_path")
    .eq("talent_id", id);
  const paths = (photos ?? [])
    .map((p) => p.storage_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await supabase.storage.from("talent-photos").remove(paths);
  }
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/duplicates");
  revalidatePath("/admin/talents");
  revalidatePath("/admin");
}

// แอดมินให้ดาว 0-5 (ใช้จัดอันดับหน้า /talents) — 0 = เอาดาวออก
export async function setTalentRating(formData: FormData) {
  const id = String(formData.get("id"));
  const n = Math.max(0, Math.min(5, Number(formData.get("rating")) || 0));
  const { error } = await supabase
    .from("talents")
    .update({ rating: n })
    .eq("id", id);
  // คอลัมน์ยังไม่มี (ยังไม่รัน migration 019) — ไม่ให้หน้าพัง
  if (error) {
    redirect(
      `/admin/talents/${id}?error=${encodeURIComponent("ให้ดาวไม่สำเร็จ (ยังไม่ได้รัน migration 019)")}`,
    );
  }
  revalidatePath(`/admin/talents/${id}`);
  revalidatePath("/admin/talents");
  revalidatePath("/talents");
}

// สรุปโปรไฟล์สำหรับแถบหัวหน้าจัดการ talent (หลังบ้าน):
// ความครบของข้อมูล · จำนวนรูป/คอมการ์ด · งานที่เคยอยู่ · รูปตัวแทน
export async function getTalentAdminSummary(talentId: string) {
  const [{ data: photos }, { data: pts }] = await Promise.all([
    supabase
      .from("talent_photos")
      .select("kind, storage_path, display_order")
      .eq("talent_id", talentId)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_talents")
      .select("project_id, project:projects(id, name, shooting_date, project_type)")
      .eq("talent_id", talentId),
  ]);

  const all = photos ?? [];
  const projects = (pts ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r) => r.project as any)
    .filter(Boolean)
    .sort((a, b) =>
      String(b.shooting_date ?? "").localeCompare(String(a.shooting_date ?? "")),
    );

  return {
    photoCount: all.filter((p) => p.kind === "gallery").length,
    hasCompcard: all.some((p) => p.kind === "compcard"),
    photoPath:
      all.find((p) => p.kind === "gallery")?.storage_path ??
      all.find((p) => p.kind === "compcard")?.storage_path ??
      null,
    projects,
  };
}

// ===== รอคอมการ์ดจากแก้มแดง (คนเพิ่งจองถ่ายโปรไฟล์ ยังไม่มีคอมการ์ด) =====

// talent เลือก "รอคอมการ์ดจากแก้มแดง" ในขั้นรูป → เข้าคิวให้แอดมินอัพให้ทีหลัง
export async function setAwaitingCompcard(talentId: string, on: boolean) {
  const owned = await getOwnedTalent(talentId);
  if (!owned) return { ok: false as const, error: "forbidden" };
  const { error } = await supabase
    .from("talents")
    .update({ compcard_awaiting_at: on ? new Date().toISOString() : null })
    .eq("id", talentId);
  // คอลัมน์ยังไม่มี (ยังไม่รัน migration 018) — ไม่ให้ flow สมัครพัง
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/compcards");
  return { ok: true as const };
}

// คิวหลังบ้าน: คนที่รอคอมการ์ด (รอนานสุดขึ้นก่อน) + รูปตัวแทน + มีคอมการ์ดยัง
export async function getAwaitingCompcardTalents() {
  const { data: talents, error } = await supabase
    .from("talents")
    .select("*")
    .not("compcard_awaiting_at", "is", null)
    .order("compcard_awaiting_at", { ascending: true });
  if (error) return []; // ยังไม่รัน migration 018
  if (!talents || talents.length === 0) return [];

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return talents.map((t) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
    return {
      ...t,
      photo_path: pickPrimaryPhoto(t, mine),
      has_compcard: mine.some((p) => p.kind === "compcard"),
    };
  });
}

export async function getAwaitingCompcardCount() {
  const { count, error } = await supabase
    .from("talents")
    .select("id", { count: "exact", head: true })
    .not("compcard_awaiting_at", "is", null);
  if (error) return 0; // ยังไม่รัน migration 018
  return count ?? 0;
}

// แอดมินกด "เสร็จแล้ว / เอาออกจากคิว" — เคลียร์สถานะรอ
export async function clearAwaitingCompcard(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("talents")
    .update({ compcard_awaiting_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/compcards");
  revalidatePath("/admin");
}

// ===== คำขอลบประวัติ (self-service PDPA) =====
// talent (แม่) กดขอลบโปรไฟล์ลูกเอง → ตั้ง deletion_requested_at → ซ่อนจาก
// หน้าสาธารณะทันที (getPublicTalents กรองออก) แต่ข้อมูลยังอยู่จนแอดมิน approve

export async function requestProfileDeletion(talentId: string) {
  const owned = await getOwnedTalent(talentId);
  if (!owned) return { ok: false as const, error: "forbidden" };
  const { error } = await supabase
    .from("talents")
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq("id", talentId);
  if (error) {
    // คอลัมน์ยังไม่มี (ยังไม่รัน migration 016) — ไม่ให้ flow พัง
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/apply/profiles");
  return { ok: true as const };
}

export async function cancelProfileDeletion(talentId: string) {
  const owned = await getOwnedTalent(talentId);
  if (!owned) return { ok: false as const, error: "forbidden" };
  const { error } = await supabase
    .from("talents")
    .update({ deletion_requested_at: null })
    .eq("id", talentId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/apply/profiles");
  return { ok: true as const };
}

// แอดมิน: คิวคำขอลบประวัติ (หน้า Dashboard)
export async function getDeletionRequests() {
  const { data, error } = await supabase
    .from("talents")
    .select("id, code, nickname_th, nickname_en, status, deletion_requested_at")
    .not("deletion_requested_at", "is", null)
    .order("deletion_requested_at", { ascending: true });
  if (error) return []; // คอลัมน์ยังไม่มี (ยังไม่รัน migration 016)
  return data ?? [];
}

// แอดมิน approve ลบถาวร — ลบไฟล์รูปใน storage ก่อน (PDPA) แล้วค่อยลบ row
// (rows ที่อ้าง talent_id จะ cascade ตาม schema)
export async function approveDeletion(formData: FormData) {
  const id = String(formData.get("id"));
  // ⚠️ ลบประวัติถาวร (ลบรูปใน storage ด้วย) — ต้องมีรหัสยืนยัน
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(`/admin?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบประวัติ")}`);
  }
  const { data: photos } = await supabase
    .from("talent_photos")
    .select("storage_path")
    .eq("talent_id", id);
  const paths = (photos ?? [])
    .map((p) => p.storage_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await supabase.storage.from("talent-photos").remove(paths);
  }
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/talents");
}

// แอดมินปฏิเสธคำขอ (คืนสภาพ) — เคลียร์ flag
export async function rejectDeletionRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("talents")
    .update({ deletion_requested_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
