"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_talents(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
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
  const payload = {
    name,
    client_name: str(formData, "client_name"),
    description: str(formData, "description"),
    project_type: projectType === "influencer" ? "influencer" : "model",
    shooting_date: str(formData, "shooting_date"),
    budget: str(formData, "budget"),
    status: str(formData, "status") ?? "draft",
  };

  if (id) {
    const { error } = await supabase.from("projects").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/projects");
    redirect(`/admin/projects/${id}`);
  }

  const { data: created, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${created.id}`);
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
