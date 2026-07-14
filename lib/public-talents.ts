import "server-only";
import { supabase } from "@/lib/supabase/server";

export type PublicTalent = {
  id: string;
  name: string;
  dob: string | null;
  is_model: boolean;
  is_influencer: boolean;
  is_ai_model: boolean;
  character: string | null;
  photo_path: string | null;
};

// The public homepage: active talents only, mapped to an explicit minimal
// shape so nothing sensitive (phone/email/LINE ids/notes) can leak into
// the public HTML. Photo = first gallery shot, comp card as fallback.
export async function getPublicTalents(): Promise<PublicTalent[]> {
  const { data: talents, error } = await supabase
    .from("talents")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!talents || talents.length === 0) return [];

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return talents.map((t) => {
    const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
    const gallery = mine.find((p) => p.kind === "gallery")?.storage_path ?? null;
    const compcard = mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
    return {
      id: t.id,
      name: t.nickname_en || t.nickname_th || t.code,
      dob: t.dob,
      is_model: t.is_model === true,
      is_influencer: t.is_influencer === true,
      // อ่านแบบกันพัง: ก่อน migration 003 คอลัมน์นี้ยังไม่มี → undefined → false
      is_ai_model: t.is_ai_model === true,
      character: t.character ?? null,
      photo_path: gallery ?? compcard,
    };
  });
}
