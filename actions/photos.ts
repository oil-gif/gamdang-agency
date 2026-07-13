"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";

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

  const { data: photo } = await supabase
    .from("talent_photos")
    .select("storage_path, kind")
    .eq("id", id)
    .single();

  if (photo) {
    await supabase.storage.from("talent-photos").remove([photo.storage_path]);
    await supabase.from("talent_photos").delete().eq("id", id);

    if (photo.kind === "compcard") {
      await supabase.from("talents").update({ compcard_photo_id: null }).eq("id", talentId);
    }
  }

  revalidatePath(`/admin/talents/${talentId}`);
}
