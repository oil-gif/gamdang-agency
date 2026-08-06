import "server-only";
import { supabase } from "@/lib/supabase/server";

// Look up a client link by its token. Returns null for unknown tokens;
// the caller decides how to render revoked/expired states.
export async function getLinkWithProject(token: string) {
  const { data: link } = await supabase
    .from("project_links")
    // ระบุ column ของ projects ให้ชัด — ห้ามใช้ projects(*) เพราะจะลาก
    // internal_note (โน้ตภายในทีม) ออกไปหน้าที่ลูกค้าเปิดดูได้
    .select(
      "*, project:projects(id, name, client_name, shooting_date, project_type)",
    )
    .eq("token", token)
    .maybeSingle();
  return link;
}

export async function bumpViewCount(linkId: string, current: number) {
  // Best-effort analytics — never block the page on this.
  await supabase
    .from("project_links")
    .update({ view_count: current + 1 })
    .eq("id", linkId);
}
