"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { isMissingColumn } from "@/lib/db-errors";
import { supabase } from "@/lib/supabase/server";

const LINK_TTL_DAYS = 30;

export async function getProjectLinks(projectId: string) {
  const { data, error } = await supabase
    .from("project_links")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createProjectLink(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const token = randomBytes(16).toString("base64url");
  const expiresAt = new Date(
    Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // เลือกเฉพาะบท (Role) ที่จะให้ลูกค้าเห็น — ติ๊กมาจากฟอร์มสร้างลิงก์
  // ไม่ติ๊กเลย = โชว์ทุกบท (เก็บเป็น null) เหมือนลิงก์เดิมทุกใบ
  // "none" = คนที่ยังไม่ระบุบท · ดู migration 027
  const picked = formData.getAll("role_ids").map(String).filter(Boolean);

  const row: Record<string, unknown> = {
    project_id: projectId,
    token,
    expires_at: expiresAt,
  };
  if (picked.length > 0) row.role_ids = picked;

  let { error } = await supabase.from("project_links").insert(row);
  // ยังไม่รัน migration 027 → column role_ids ยังไม่มี · สร้างลิงก์แบบเห็นทุกบท
  // ไปก่อน ดีกว่าปล่อยให้ปุ่มสร้างลิงก์พังทั้งปุ่ม
  if (isMissingColumn(error)) {
    const { role_ids: _r, ...base } = row;
    void _r;
    ({ error } = await supabase.from("project_links").insert(base));
  }
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function revokeProjectLink(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase
    .from("project_links")
    .update({ status: "revoked" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}

// Renew = push expiry another 30 days out and bump the counter.
export async function renewProjectLink(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { data: link } = await supabase
    .from("project_links")
    .select("renewed_count")
    .eq("id", id)
    .single();
  const { error } = await supabase
    .from("project_links")
    .update({
      expires_at: new Date(
        Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      renewed_count: (link?.renewed_count ?? 0) + 1,
      status: "active",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
}
