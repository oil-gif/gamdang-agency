import "server-only";
import { supabase } from "@/lib/supabase/server";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";
import type { GridCardSocial } from "@/components/talent/TalentGridCard";

export const PUBLIC_PAGE_SIZE = 60;

export type PublicTalent = {
  id: string;
  name: string;
  nameSub: string | null;
  gender: string | null;
  dob: string | null;
  is_model: boolean;
  is_influencer: boolean;
  is_ai_model: boolean;
  character: string | null;
  photo_path: string | null;
  socials: GridCardSocial[];
  top: { short: string; color: string; count: string } | null;
};

export type PublicTab = "model" | "influencer" | "ai";

function tabFilter(tab: PublicTab) {
  return tab === "model"
    ? "is_model"
    : tab === "influencer"
      ? "is_influencer"
      : "is_ai_model";
}

// จำนวนต่อ tab (query แบบ count-only เร็วแม้ข้อมูลหลักหมื่น)
export async function getPublicTabCounts(): Promise<Record<PublicTab, number>> {
  const count = async (tab: PublicTab) => {
    const { count: n } = await supabase
      .from("talents")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq(tabFilter(tab), true);
    return n ?? 0;
  };
  const [model, influencer, ai] = await Promise.all([
    count("model"),
    count("influencer"),
    count("ai"),
  ]);
  return { model, influencer, ai };
}

// หน้า public: active เท่านั้น แบ่งหน้า (60/หน้า) + map เป็น shape ขั้นต่ำ
// กันข้อมูลอ่อนไหว (เบอร์/LINE id/โน้ต) หลุดลง HTML สาธารณะ
export async function getPublicTalentsPage(
  tab: PublicTab,
  page: number,
): Promise<{ talents: PublicTalent[]; total: number }> {
  const from = (page - 1) * PUBLIC_PAGE_SIZE;
  const { data: rows, count, error } = await supabase
    .from("talents")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .eq(tabFilter(tab), true)
    .order("created_at", { ascending: false })
    .range(from, from + PUBLIC_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const talents = rows ?? [];
  if (talents.length === 0) return { talents: [], total: count ?? 0 };

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return {
    total: count ?? 0,
    talents: talents.map((t) => {
      const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
      const gallery = mine.find((p) => p.kind === "gallery")?.storage_path ?? null;
      const compcard = mine.find((p) => p.kind === "compcard")?.storage_path ?? null;
      const socials = t.is_influencer
        ? talentSocials(t).map((s) => ({
            key: s.key,
            short: s.short,
            color: s.color,
            url: s.url,
            followers: s.followers,
          }))
        : [];
      const top = t.is_influencer ? topSocial(t) : null;
      return {
        id: t.id,
        name: t.nickname_en || t.nickname_th || t.code,
        nameSub:
          t.nickname_en && t.nickname_th && t.nickname_en !== t.nickname_th
            ? t.nickname_th
            : null,
        gender: t.gender ?? null,
        dob: t.dob,
        is_model: t.is_model === true,
        is_influencer: t.is_influencer === true,
        is_ai_model: t.is_ai_model === true,
        character: t.character ?? null,
        photo_path: gallery ?? compcard,
        socials,
        top: top
          ? {
              short: top.short,
              color: top.color,
              count: formatFollowers(top.followers),
            }
          : null,
      };
    }),
  };
}
