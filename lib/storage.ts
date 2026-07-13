import "server-only";
import { supabase } from "@/lib/supabase/server";

export function getPhotoUrl(path: string) {
  return supabase.storage.from("talent-photos").getPublicUrl(path).data.publicUrl;
}
