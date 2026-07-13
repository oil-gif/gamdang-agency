import "server-only";
import { supabase } from "@/lib/supabase/server";

// Look up a client link by its token. Returns null for unknown tokens;
// the caller decides how to render revoked/expired states.
export async function getLinkWithProject(token: string) {
  const { data: link } = await supabase
    .from("project_links")
    .select("*, project:projects(*)")
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
