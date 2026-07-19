"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { yearsAgo } from "@/lib/age";
import { supabase } from "@/lib/supabase/server";

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_talents(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export type ProjectFilters = {
  q?: string; // ชื่องาน / ชื่อลูกค้า
  type?: "model" | "influencer";
  year?: number; // ปีของงาน (ยึด shooting date — ไม่มีก็ใช้วันที่สร้าง)
};

// list โปรเจกต์แบบแบ่งหน้า + ค้นหา — รองรับเป็นร้อยเป็นพันโปรเจกต์
export async function getProjectsPage(filters: ProjectFilters = {}, page = 1) {
  const { PROJECTS_PAGE_SIZE } = await import("@/lib/constants");
  let query = supabase
    .from("projects")
    .select("*, project_talents(count)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${term}%,client_name.ilike.%${term}%`);
  }
  if (filters.type) query = query.eq("project_type", filters.type);
  if (filters.year) {
    const y = filters.year;
    // ปีของงาน = ปีวันถ่าย ถ้าไม่มีวันถ่ายใช้ปีที่สร้างโปรเจกต์แทน
    query = query.or(
      `and(shooting_date.gte.${y}-01-01,shooting_date.lte.${y}-12-31),and(shooting_date.is.null,created_at.gte.${y}-01-01,created_at.lte.${y}-12-31)`,
    );
  }

  const from = (page - 1) * PROJECTS_PAGE_SIZE;
  const { data, count, error } = await query.range(
    from,
    from + PROJECTS_PAGE_SIZE - 1,
  );
  if (error) throw new Error(error.message);
  return { projects: data ?? [], total: count ?? 0 };
}

// จำนวนโปรเจกต์แยกตามประเภท (count-only query — เร็วแม้มีเป็นพัน)
export async function getProjectCounts() {
  const count = async (type?: string) => {
    let q = supabase.from("projects").select("id", { count: "exact", head: true });
    if (type) q = q.eq("project_type", type);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [total, model, influencer] = await Promise.all([
    count(),
    count("model"),
    count("influencer"),
  ]);
  return { total, model, influencer };
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// A project's talents joined with the talent row + their comp card path, so
// the manage screen (and later the client link) can render cards without
// N extra queries.
export async function getProjectTalents(projectId: string) {
  const { data: rows, error } = await supabase
    .from("project_talents")
    .select("*, talent:talents(*)")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const talentIds = rows.map((r) => r.talent_id);
  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in("talent_id", talentIds)
    .order("display_order", { ascending: true });

  return rows.map((r) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === r.talent_id);
    return {
      ...r,
      compcard_path: mine.find((p) => p.kind === "compcard")?.storage_path ?? null,
      gallery_paths: mine
        .filter((p) => p.kind === "gallery")
        .map((p) => p.storage_path),
    };
  });
}

// Candidates for the "เพิ่ม Talent" picker: active talents matching the
// search, excluding ones already in the project, with a photo for the
// mini preview card (gallery first for influencers, comp card otherwise).
export type PickerFilters = {
  q?: string;
  role?: "model" | "influencer";
  tiers?: string[];
  categories?: string[];
  minAge?: number;
  maxAge?: number;
  page?: number;
};

const PICKER_PAGE_SIZE = 12;

export async function getPickerTalents(
  projectId: string,
  f: PickerFilters = {},
) {
  const { data: existing } = await supabase
    .from("project_talents")
    .select("talent_id")
    .eq("project_id", projectId);
  const excludeIds = (existing ?? []).map((r) => r.talent_id);

  let query = supabase
    .from("talents")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // ตัดคนที่อยู่ในโปรเจกต์แล้วออกในระดับ query (เพื่อให้ paginate + นับถูก)
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }
  if (f.q) {
    const term = f.q.replace(/[%,]/g, "");
    query = query.or(
      `nickname_th.ilike.%${term}%,nickname_en.ilike.%${term}%,code.ilike.%${term}%`,
    );
  }
  if (f.role === "model") query = query.eq("is_model", true);
  if (f.role === "influencer") query = query.eq("is_influencer", true);
  if (f.tiers && f.tiers.length > 0) query = query.in("tier", f.tiers);
  if (f.categories && f.categories.length > 0)
    query = query.overlaps("categories", f.categories);
  if (f.minAge) query = query.lte("dob", yearsAgo(f.minAge));
  if (f.maxAge) query = query.gte("dob", yearsAgo(f.maxAge + 1));

  const page = Math.max(f.page ?? 1, 1);
  const from = (page - 1) * PICKER_PAGE_SIZE;
  const {
    data: talents,
    count,
    error,
  } = await query.range(from, from + PICKER_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / PICKER_PAGE_SIZE), 1);
  if (!talents || talents.length === 0) {
    return { candidates: [], total, page, totalPages };
  }

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  const candidates = talents.map((t) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
    const gallery = mine.find((p) => p.kind === "gallery")?.storage_path ?? null;
    const compcard = mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
    return { ...t, photo_path: t.is_influencer ? (gallery ?? compcard) : (compcard ?? gallery) };
  });
  return { candidates, total, page, totalPages };
}

function str(formData: FormData, key: string) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? null : value;
}

export async function saveProject(formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) {
    const backTo = id ? `/admin/projects/${id}` : "/admin/projects/new";
    redirect(`${backTo}?error=${encodeURIComponent("กรุณากรอกชื่อโปรเจกต์")}`);
  }

  const projectType = str(formData, "project_type");
  const base = {
    name,
    client_name: str(formData, "client_name"),
    description: str(formData, "description"),
    project_type: projectType === "influencer" ? "influencer" : "model",
    shooting_date: str(formData, "shooting_date"),
    budget: str(formData, "budget"),
    status: str(formData, "status") ?? "draft",
  };
  // Casting Calls (หน้าสาธารณะ) — ต้องการ migration 013
  const casting = {
    category: str(formData, "category"),
    cover_path: str(formData, "cover_path"),
    is_published: formData.get("is_published") === "on",
    casting_closed: formData.get("casting_closed") === "on",
  };
  const payload = { ...base, ...casting };

  if (id) {
    let { error } = await supabase.from("projects").update(payload).eq("id", id);
    // ยังไม่ได้ run migration 013 → column ยังไม่มี, บันทึกเฉพาะ base ไปก่อน
    if (isMissingColumn(error)) {
      ({ error } = await supabase.from("projects").update(base).eq("id", id));
    }
    if (error) throw new Error(error.message);
    revalidatePath("/admin/projects");
    redirect(`/admin/projects/${id}`);
  }

  let { data: created, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();
  if (isMissingColumn(error)) {
    ({ data: created, error } = await supabase
      .from("projects")
      .insert(base)
      .select("id")
      .single());
  }
  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${created!.id}`);
}

// column ที่เพิ่มใน migration ยังไม่มีในฐานข้อมูล (deploy ก่อน run migration)
function isMissingColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column|schema cache|could not find/i.test(error.message ?? "")
  );
}

// ===== Roles ในโปรเจกต์ =====
export async function getProjectRoles(projectId: string) {
  const { data, error } = await supabase
    .from("project_roles")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  // ยังไม่ได้ run migration 013 → ตารางยังไม่มี, คืน [] ไปก่อน (ไม่ให้หน้าพัง)
  if (error) return [];
  return data;
}

export async function addProjectRole(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const title = str(formData, "title");
  if (!title) return;
  const { data: maxRow } = await supabase
    .from("project_roles")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("project_roles").insert({
    project_id: projectId,
    title,
    description: str(formData, "description"),
    display_order: (maxRow?.display_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProjectRole(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase.from("project_roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// ===== ผู้สมัครเข้าร่วม (Applications) =====
export async function getProjectApplications(projectId: string) {
  const { data: apps, error } = await supabase
    .from("project_applications")
    .select("*, talent:talents(*), role:project_roles(title)")
    .eq("project_id", projectId)
    .order("applied_at", { ascending: false });
  // ยังไม่ได้ run migration 013 → ตารางยังไม่มี, คืน [] ไปก่อน (ไม่ให้หน้าพัง)
  if (error) return [];
  if (!apps || apps.length === 0) return [];

  const talentIds = apps.map((a) => a.talent_id);
  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in("talent_id", talentIds)
    .order("display_order", { ascending: true });
  return apps.map((a) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === a.talent_id);
    return {
      ...a,
      photo_path:
        mine.find((p) => p.kind === "gallery")?.storage_path ??
        mine.find((p) => p.kind === "compcard")?.storage_path ??
        null,
    };
  });
}

// อนุมัติผู้สมัคร → เพิ่มเข้า project_talents (proposal เสนอลูกค้า)
export async function approveApplication(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { data: app } = await supabase
    .from("project_applications")
    .select("talent_id")
    .eq("id", id)
    .maybeSingle();
  if (!app) return;

  const { data: project } = await supabase
    .from("projects")
    .select("project_type")
    .eq("id", projectId)
    .single();
  const cardType = project?.project_type === "influencer" ? "influcard" : "compcard";

  const { data: maxRow } = await supabase
    .from("project_talents")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  // เพิ่มเข้า proposal (ถ้ายังไม่มี) แล้ว mark ใบสมัครเป็น approved
  await supabase.from("project_talents").insert({
    project_id: projectId,
    talent_id: app.talent_id,
    card_type: cardType,
    display_order: (maxRow?.display_order ?? -1) + 1,
  });
  await supabase
    .from("project_applications")
    .update({ status: "approved" })
    .eq("id", id);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function rejectApplication(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  await supabase
    .from("project_applications")
    .update({ status: "rejected" })
    .eq("id", id);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id"));
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function addTalentToProject(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const talentId = String(formData.get("talent_id"));

  // Default the card type to the project's job type (งาน Model → comp card,
  // งาน Influencer → influ card). Admin can flip it per talent afterwards.
  const { data: project } = await supabase
    .from("projects")
    .select("project_type")
    .eq("id", projectId)
    .single();
  const cardType =
    project?.project_type === "influencer" ? "influcard" : "compcard";

  const { data: maxRow } = await supabase
    .from("project_talents")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.display_order ?? -1) + 1;

  const { error } = await supabase.from("project_talents").insert({
    project_id: projectId,
    talent_id: talentId,
    card_type: cardType,
    display_order: nextOrder,
  });
  // Ignore duplicate (talent already in project) — unique constraint.
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function removeTalentFromProject(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase.from("project_talents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function setProjectTalentCardType(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const cardType = String(formData.get("card_type"));
  if (cardType !== "compcard" && cardType !== "influcard") return;
  const { error } = await supabase
    .from("project_talents")
    .update({ card_type: cardType })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// ===== Admin ทำแทนลูกค้า/talent ได้ (เผื่อคุยกันนอกระบบ ทางโทร/แชท) =====

// ติ๊ก "ลูกค้าสนใจ" แทนลูกค้า
export async function toggleClientInterestAdmin(formData: FormData) {
  const ptId = String(formData.get("pt_id"));
  const projectId = String(formData.get("project_id"));
  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, client_interested")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt) return;
  const { error } = await supabase
    .from("project_talents")
    .update({ client_interested: !pt.client_interested })
    .eq("id", pt.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// บันทึกคำตอบ รับงาน/ปฏิเสธ แทน talent
export async function setTalentResponseAdmin(formData: FormData) {
  const ptId = String(formData.get("pt_id"));
  const projectId = String(formData.get("project_id"));
  const response = String(formData.get("response"));
  if (!["accepted", "declined", "pending"].includes(response)) return;
  const { error } = await supabase
    .from("project_talents")
    .update({ talent_response: response })
    .eq("id", ptId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// Swap display_order with the neighbour in the given direction. Simple and
// robust for the modest list sizes here (no drag-and-drop dependency).
export async function moveProjectTalent(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const dir = String(formData.get("dir")); // "up" | "down"

  const { data: rows } = await supabase
    .from("project_talents")
    .select("id, display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  if (!rows) return;

  const idx = rows.findIndex((r) => r.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;

  const a = rows[idx];
  const b = rows[swapIdx];
  await supabase
    .from("project_talents")
    .update({ display_order: b.display_order })
    .eq("id", a.id);
  await supabase
    .from("project_talents")
    .update({ display_order: a.display_order })
    .eq("id", b.id);
  revalidatePath(`/admin/projects/${projectId}`);
}
