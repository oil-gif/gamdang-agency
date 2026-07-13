"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { computeTierAndFollowers } from "@/lib/tier";
import { CATEGORIES, ETHNICITIES } from "@/lib/constants";
import { yearsAgo } from "@/lib/age";
import { getTalentSession } from "@/lib/auth/talent-session";

export type TalentFilters = {
  q?: string;
  role?: "model" | "influencer";
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

export async function getTalent(id: string) {
  const { data, error } = await supabase
    .from("talents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
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
  if (!gender || !dob) {
    redirect(
      `${backTo}?error=${encodeURIComponent("กรุณากรอกเพศและวันเกิด (บังคับ)")}`,
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
    const { error } = await supabase.from("talents").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/talents");
    redirect("/admin/talents");
  }

  const { data: created, error } = await supabase
    .from("talents")
    .insert({ ...payload, source: "admin" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/talents");
  // Go straight to the edit page so photos can be added right away.
  redirect(`/admin/talents/${created.id}`);
}

// Same shape as saveTalent(), but for the LIFF self-service flow: the
// talent id comes from their session cookie (never from formData, so one
// talent can't edit another's row), and status/source are never part of
// the payload so a talent can't grant themselves "active".
export async function saveTalentSelf(formData: FormData) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");

  const gender = str(formData, "gender");
  const dob = str(formData, "dob");
  const phone = str(formData, "phone");
  if (!gender || !dob || !phone) {
    redirect(
      `/apply/edit?error=${encodeURIComponent("กรุณากรอกเพศ วันเกิด และเบอร์โทร (บังคับ)")}`,
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

  const { error } = await supabase
    .from("talents")
    .update(payload)
    .eq("id", session.talentId);
  if (error) throw new Error(error.message);

  revalidatePath("/apply/edit");
  redirect("/apply/edit?saved=1");
}

export async function deleteTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase.from("talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/talents");
}
