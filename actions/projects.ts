"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyCasting } from "@/lib/admin-notify";
import { yearsAgo } from "@/lib/age";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/lib/supabase/server";
import { verifyDangerCode } from "@/lib/danger";

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

  // แม็พ role_id → ชื่อ Role (ถ้ามี — migration 017)
  const roleIds = [
    ...new Set(
      rows
        .map((r) => (r as { role_id?: string | null }).role_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  // เก็บลำดับของ Role ด้วย — กลุ่มไหนขึ้นก่อนให้ยึด project_roles.display_order
  // (เดิมเรียงตามชื่อ Role ตามตัวอักษร ทำให้แอดมินจัดลำดับกลุ่มเองไม่ได้)
  const roleMap = new Map<string, { title: string; order: number }>();
  if (roleIds.length > 0) {
    const { data: rr } = await supabase
      .from("project_roles")
      .select("id, title, display_order")
      .in("id", roleIds);
    for (const r of rr ?? [])
      roleMap.set(r.id, { title: r.title, order: r.display_order ?? 0 });
  }

  const result = rows.map((r) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === r.talent_id);
    const roleId = (r as { role_id?: string | null }).role_id ?? null;
    return {
      ...r,
      role_title: roleId ? (roleMap.get(roleId)?.title ?? null) : null,
      // คนไม่มี Role ไปท้ายสุดเสมอ
      _roleOrder: roleId ? (roleMap.get(roleId)?.order ?? 0) : Number.MAX_SAFE_INTEGER,
      compcard_path: mine.find((p) => p.kind === "compcard")?.storage_path ?? null,
      gallery_paths: mine
        .filter((p) => p.kind === "gallery")
        .map((p) => p.storage_path),
    };
  });

  // จัดกลุ่มตามลำดับ Role ที่แอดมินตั้งไว้ (คนไม่มี role ไปท้ายสุด)
  // แล้วเรียงตาม display_order ของคนในกลุ่ม
  result.sort((a, b) => {
    if (a._roleOrder !== b._roleOrder) return a._roleOrder - b._roleOrder;
    // Role คนละอันแต่ display_order เท่ากัน (ข้อมูลเก่า) → ยึดชื่อกันสลับมั่ว
    const ra = a.role_title ?? "￿";
    const rb = b.role_title ?? "￿";
    if (ra !== rb) return ra.localeCompare(rb, "th");
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
  return result;
}

// Candidates for the "เพิ่ม Talent" picker: active talents matching the
// search, excluding ones already in the project, with a photo for the
// mini preview card (gallery first for influencers, comp card otherwise).
export type PickerFilters = {
  q?: string;
  role?: "model" | "influencer";
  gender?: "male" | "female" | "other";
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
  if (f.gender) query = query.eq("gender", f.gender);
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
  // โน้ตภายในทีม (migration 021) — หลังบ้านเห็นเท่านั้น ห้าม render หน้าสาธารณะ
  const internal = { internal_note: str(formData, "internal_note") };
  const payload = { ...base, ...casting, ...internal };

  // ข้อความแจ้งงาน Casting เข้ากลุ่มทีม (พร้อมลิงก์สาธารณะ)
  const castingLines = (pid: string) =>
    [
      "📣 มีงาน Casting ใหม่เปิดรับสมัคร!",
      `งาน: ${name}`,
      base.client_name ? `ลูกค้า: ${base.client_name}` : "",
      base.shooting_date ? `วันถ่าย: ${base.shooting_date}` : "",
      "",
      `ดู/แชร์ลิงก์รับสมัคร: ${SITE_URL}/casting/${pid}`,
    ].filter(Boolean);

  if (id) {
    // เช็คสถานะเผยแพร่เดิม เพื่อแจ้งกลุ่มเฉพาะตอน "เพิ่งเผยแพร่" (ไม่ซ้ำทุกครั้งที่แก้)
    const { data: prev } = await supabase
      .from("projects")
      .select("is_published")
      .eq("id", id)
      .maybeSingle();
    const wasPublished = prev?.is_published === true;
    let { error } = await supabase.from("projects").update(payload).eq("id", id);
    // ยังไม่ได้ run migration 013/021 → column ยังไม่มี, บันทึกเฉพาะ base ไปก่อน
    if (isMissingColumn(error)) {
      ({ error } = await supabase.from("projects").update(base).eq("id", id));
    } else if (!error && casting.is_published && !wasPublished) {
      // แจ้งกลุ่มเป็น best-effort — โควตา LINE เต็มต้องไม่ทำให้บันทึกงานล้ม
      try {
        await notifyCasting(castingLines(id));
      } catch (e) {
        console.error("notifyCasting (update) failed", e);
      }
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
  } else if (!error && created && casting.is_published) {
    try {
      await notifyCasting(castingLines(created.id));
    } catch (e) {
      console.error("notifyCasting (create) failed", e);
    }
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

// แก้ข้อความ Role (ชื่อ/รายละเอียด) — ข้อความ role มักยาว (เรตค่าตัว/เงื่อนไข)
// แอดมินต้องแก้ทีหลังได้โดยไม่ต้องลบแล้วสร้างใหม่ (ผู้สมัครที่เลือก role นี้ไว้จะไม่หลุด)
// จัดลำดับ Role — กำหนดว่ากลุ่มไหนขึ้นก่อนในหน้าโปรเจกต์ ใบเสนอ PDF และ Report
// (project_roles.display_order มีมาตั้งแต่แรกแต่หน้าเว็บไม่เคยใช้ — เรียงตาม
//  ชื่อ Role ตามตัวอักษรแทน ทำให้จัดลำดับเองไม่ได้)
export async function reorderProjectRoles(projectId: string, orderedIds: string[]) {
  if (!projectId || orderedIds.length === 0) return;
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("project_roles")
        .update({ display_order: i })
        .eq("id", id)
        .eq("project_id", projectId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/report`);
  revalidatePath(`/admin/projects/${projectId}/print`);
}

export async function updateProjectRole(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const title = str(formData, "title");
  if (!title) {
    redirect(
      `/admin/projects/${projectId}?error=${encodeURIComponent("ชื่อ Role ห้ามว่าง")}#roles`,
    );
  }
  const { error } = await supabase
    .from("project_roles")
    .update({ title, description: str(formData, "description") })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/casting/${projectId}`);
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
    .select("talent_id, role_id")
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
  // เก็บ role_id ที่สมัครมาด้วย (defensive: ถ้ายังไม่รัน migration 017 → ใส่ base)
  const ptRow = {
    project_id: projectId,
    talent_id: app.talent_id,
    card_type: cardType,
    display_order: (maxRow?.display_order ?? -1) + 1,
    role_id: (app as { role_id?: string | null }).role_id ?? null,
  };
  const { error: insErr } = await supabase.from("project_talents").insert(ptRow);
  if (isMissingColumn(insErr)) {
    const { role_id: _role, ...base } = ptRow;
    void _role;
    await supabase.from("project_talents").insert(base);
  }
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

// กดปฏิเสธผิดคน — คืนใบสมัครกลับเป็น "รอตรวจ" ได้ (ไม่มีผลข้างเคียง
// เพราะตอนปฏิเสธไม่ได้แตะอะไรนอกจาก status และไม่ได้ส่ง LINE)
export async function unrejectApplication(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  await supabase
    .from("project_applications")
    .update({ status: "pending" })
    .eq("id", id)
    .eq("status", "rejected");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id"));
  // ⚠️ กู้คืนไม่ได้ (ลบ talent ในงาน/ใบสมัคร/ลิงก์ลูกค้าทั้งหมด) — ต้องมีรหัสยืนยัน
  if (!verifyDangerCode(String(formData.get("danger_code") ?? ""))) {
    redirect(
      `/admin/projects/${id}?error=${encodeURIComponent("รหัสยืนยันไม่ถูกต้อง — ยังไม่ได้ลบโปรเจกต์")}`,
    );
  }
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function addTalentToProject(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const talentId = String(formData.get("talent_id"));
  // แอดมินเลือก Role ที่จะเอา talent เข้า (ถ้างานมีหลาย Role) — ว่างได้
  const roleId = String(formData.get("role_id") ?? "").trim() || null;

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

  const row = {
    project_id: projectId,
    talent_id: talentId,
    card_type: cardType,
    display_order: nextOrder,
    role_id: roleId,
  };
  let { error } = await supabase.from("project_talents").insert(row);
  // ยังไม่รัน migration 017 → column role_id ยังไม่มี, ใส่ base ไปก่อน
  if (isMissingColumn(error)) {
    const { role_id: _r, ...base } = row;
    void _r;
    ({ error } = await supabase.from("project_talents").insert(base));
  }
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

// เปลี่ยน/กำหนด Role ของ talent ที่อยู่ในโปรเจกต์แล้ว (ย้ายกลุ่ม Role)
export async function setProjectTalentRole(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const roleId = String(formData.get("role_id") ?? "").trim() || null;
  const { error } = await supabase
    .from("project_talents")
    .update({ role_id: roleId })
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
//
// ทุกค่าแก้กลับได้หมด (ทีมงานกดผิดกันบ่อย) — กดปุ่มเดิมซ้ำ = "pending" (รอตอบ)
// ส่ง "none" = ล้างกลับเป็นยังไม่แจ้งงาน · การกดตรงนี้ไม่ส่ง LINE ให้ talent
export async function setTalentResponseAdmin(formData: FormData) {
  const ptId = String(formData.get("pt_id"));
  const projectId = String(formData.get("project_id"));
  const response = String(formData.get("response"));
  if (!["accepted", "declined", "pending", "none"].includes(response)) return;
  const { error } = await supabase
    .from("project_talents")
    .update({ talent_response: response === "none" ? null : response })
    .eq("id", ptId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// ===== ข้อมูลเพิ่มเติมสำหรับลูกค้า (migration 022) =====
//
// แก้จากหน้าโปรเจกต์ได้เลย (ตอนคุยกับลูกค้าอยู่) แต่ "ทักษะ" เขียนลง
// talents.extra_details = ติดกับคน ใช้ได้ทุกงาน · ส่วนโน้ตกับสวิตช์โชว์
// social เขียนลง project_talents = เฉพาะงานนี้
export async function saveTalentExtraInfo(formData: FormData) {
  const ptId = String(formData.get("pt_id"));
  const projectId = String(formData.get("project_id"));
  const talentId = String(formData.get("talent_id"));
  if (!ptId || !projectId || !talentId) return;

  // ทักษะมาเป็นชุด d_label[]/d_value[] ที่ index ตรงกัน · d_show เก็บ index ที่ติ๊ก
  const labels = formData.getAll("d_label").map((v) => String(v).trim());
  const values = formData.getAll("d_value").map((v) => String(v).trim());
  const shown = new Set(formData.getAll("d_show").map((v) => String(v)));
  const details = labels
    .map((label, i) => ({ label, value: values[i] ?? "", show: shown.has(String(i)) }))
    // แถวที่ลบข้อความออกจนว่าง = ตั้งใจเอาออก
    .filter((d) => d.label !== "" || d.value !== "");

  const { error: tErr } = await supabase
    .from("talents")
    .update({ extra_details: details })
    .eq("id", talentId);
  if (tErr) throw new Error(tErr.message);

  const { error: pErr } = await supabase
    .from("project_talents")
    .update({
      notes: str(formData, "notes"),
      notes_show: formData.get("notes_show") === "on",
      show_socials: formData.get("show_socials") === "on",
    })
    .eq("id", ptId)
    .eq("project_id", projectId); // กัน id ข้ามโปรเจกต์
  if (pErr) throw new Error(pErr.message);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/report`);
}

// ===== ส่ง proposal ให้ลูกค้า =====

const SENT_VIA = ["line", "email", "link", "other"];

// บันทึกว่าส่งรายชื่อให้ลูกค้าแล้ว — ลูกค้าหลายเจ้าขอให้ส่งไฟล์ทางไลน์/อีเมล
// แทนการเปิดลิงก์ /p/[token] เอง view_count ของลิงก์เลยไม่ขยับ และไม่มีอะไร
// บอกว่างานนี้ส่งไปหรือยัง
//
// กดซ้ำตอนที่บันทึกไว้แล้ว = แก้ช่องทาง/หมายเหตุ แต่ **ไม่ขยับวันที่เดิม**
// (ถ้าอยากได้วันที่ใหม่ ให้ล้างสถานะแล้วบันทึกใหม่)
export async function markSentToClient(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const viaRaw = String(formData.get("via") ?? "");
  const via = SENT_VIA.includes(viaRaw) ? viaRaw : "other";
  const noteRaw = formData.get("note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : null;

  const { data: current } = await supabase
    .from("projects")
    .select("client_sent_at")
    .eq("id", projectId)
    .maybeSingle();

  const { error } = await supabase
    .from("projects")
    .update({
      client_sent_at: current?.client_sent_at ?? new Date().toISOString(),
      client_sent_via: via,
      client_sent_note: note,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

// กดผิด/ยังไม่ได้ส่งจริง — ล้างกลับเป็น "ยังไม่ได้ส่ง"
export async function clearSentToClient(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase
    .from("projects")
    .update({
      client_sent_at: null,
      client_sent_via: null,
      client_sent_note: null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

// Swap display_order with the neighbour in the given direction. Simple and
// robust for the modest list sizes here (no drag-and-drop dependency).
// จัดลำดับใหม่ทั้งชุดในครั้งเดียว — รับ id เรียงตามที่เห็นบนจอหลังลากวาง
//
// แทนที่ปุ่ม ▲▼ เดิมที่สลับทีละคู่: ย้ายคนที่ 15 ขึ้นบนสุดต้องกด 14 ครั้ง
// และโหลดหน้าใหม่ทุกครั้ง · อีกอย่างคือหน้าเว็บจัดกลุ่มตาม Role แต่ตัวสลับทำงาน
// บน display_order ดิบ พอมีหลาย Role เลยสลับกับคนละคนกับที่เห็นบนจอ
//
// ตรงนี้เขียน display_order ให้ "ตรงกับลำดับที่เห็นจริง" ทั้งชุด บั๊กนั้นเลยหมดไป
// (getProjectTalents เรียงตาม role แล้วค่อย display_order — ลำดับที่ส่งมาก็จัดกลุ่ม
// ตาม role อยู่แล้ว ผลลัพธ์เลยตรงกัน)
export async function reorderProjectTalents(projectId: string, orderedIds: string[]) {
  if (!projectId || orderedIds.length === 0) return;

  // ยิงขนานกัน — 15 คนก็จบในเวลาประมาณ 1 request
  // .eq("project_id") กันคนส่ง id ของโปรเจกต์อื่นมาแก้
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("project_talents")
        .update({ display_order: i })
        .eq("id", id)
        .eq("project_id", projectId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/report`);
  revalidatePath(`/admin/projects/${projectId}/print`);
}

