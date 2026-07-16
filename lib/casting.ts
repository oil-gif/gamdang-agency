import "server-only";
import { supabase } from "@/lib/supabase/server";

// ประกาศงานที่เผยแพร่หน้าสาธารณะ /casting
export async function getPublicCastings() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, category, description, cover_path, casting_closed, updated_at")
    .eq("is_published", true)
    .order("casting_closed", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

// รายละเอียดงานสาธารณะ 1 งาน + roles
export async function getPublicCasting(id: string) {
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, category, description, cover_path, casting_closed, is_published, shooting_date, updated_at",
    )
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (!project) return null;

  const { data: roles } = await supabase
    .from("project_roles")
    .select("id, title, description")
    .eq("project_id", id)
    .order("display_order", { ascending: true });

  return { ...project, roles: roles ?? [] };
}
