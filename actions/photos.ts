"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { getTalentSession } from "@/lib/auth/talent-session";

export async function getTalentPhotos(talentId: string) {
  const { data, error } = await supabase
    .from("talent_photos")
    .select("*")
    .eq("talent_id", talentId)
    .order("kind")
    .order("display_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePhoto(formData: FormData) {
  const id = String(formData.get("id"));
  const talentId = String(formData.get("talent_id"));

  // Same reasoning as /api/upload: a logged-in talent must only be able to
  // touch their own talent_id, and the photo being deleted must actually
  // belong to that talent_id (not just whatever id was posted).
  const talentSession = await getTalentSession();
  if (talentSession && talentSession.talentId !== talentId) {
    throw new Error("forbidden");
  }

  const { data: photo } = await supabase
    .from("talent_photos")
    .select("storage_path, kind, talent_id")
    .eq("id", id)
    .single();

  if (photo && photo.talent_id === talentId) {
    await supabase.storage.from("talent-photos").remove([photo.storage_path]);
    await supabase.from("talent_photos").delete().eq("id", id);

    if (photo.kind === "compcard") {
      await supabase.from("talents").update({ compcard_photo_id: null }).eq("id", talentId);
    }
  }

  revalidatePath(`/admin/talents/${talentId}`);
  revalidatePath("/apply/edit");
}
