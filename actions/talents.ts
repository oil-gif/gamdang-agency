"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { computeTierAndFollowers } from "@/lib/tier";
import { CATEGORIES, ETHNICITIES, TALENTS_PAGE_SIZE } from "@/lib/constants";
import { yearsAgo } from "@/lib/age";
import { getTalentSession } from "@/lib/auth/talent-session";

export type TalentFilters = {
  q?: string;
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
      const gallery = mine.find((p) => p.kind === "gallery")?.storage_path ?? null;
      const compcard =
        mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
      return { ...t, photo_path: gallery ?? compcard };
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
    .select("talent_id, storage_path")
    .eq("kind", "compcard")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    );

  const compcardByTalent = new Map(
    (photos ?? []).map((p) => [p.talent_id, p.storage_path]),
  );
  return talents.map((t) => ({
    ...t,
    compcard_path: compcardByTalent.get(t.id) ?? null,
  }));
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

export async function getPendingCount() {
  const { count, error } = await supabase
    .from("talents")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
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
    redirect("/admin/talents");
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
    const gallery = mine.find((p) => p.kind === "gallery")?.storage_path ?? null;
    const compcard = mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
    return { ...t, photo_path: gallery ?? compcard };
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
  if (!nicknameEn || !gender || !dob || !phone) {
    redirect(
      `${backTo}${sep}error=${encodeURIComponent("กรุณากรอกชื่อเล่น (English) เพศ วันเกิด และเบอร์โทร (บังคับ)")}`,
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
  };

  if (isNew) {
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
    redirect(`/apply/edit?id=${created.id}&saved=1`);
  }

  const { error } = await supabase
    .from("talents")
    .update(payload)
    .eq("id", owned!.id);
  if (error) throw new Error(error.message);

  revalidatePath(backTo);
  redirect(`${backTo}&saved=1`);
}

export async function deleteTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/talents");
  redirect("/admin/talents");
}
