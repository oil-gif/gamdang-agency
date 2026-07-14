import Link from "next/link";
import { getTalentsWithPhotos, type TalentFilters } from "@/actions/talents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentFilterPanel } from "@/components/admin/TalentFilterPanel";
import { STATUS_LABEL_TH, TIER_LABEL } from "@/lib/constants";
import { calculateAge } from "@/lib/age";
import { getPhotoProxyUrl } from "@/lib/storage";

type RawParams = Record<string, string | undefined>;

function parseFilters(params: RawParams): TalentFilters {
  const num = (key: string) => {
    const v = params[key];
    const n = v ? Number(v) : undefined;
    return n && Number.isFinite(n) ? n : undefined;
  };
  const pick = (key: string) => {
    const v = params[key];
    return v && v !== "any" ? v : undefined;
  };

  return {
    q: params.q || undefined,
    role: pick("role") as TalentFilters["role"],
    gender: pick("gender"),
    status: pick("status"),
    tier: pick("tier"),
    category: pick("category"),
    ethnicity: pick("ethnicity"),
    minHeight: num("min_height"),
    maxHeight: num("max_height"),
    minAge: num("min_age"),
    maxAge: num("max_age"),
  };
}

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  inactive: "bg-neutral-200 text-neutral-600",
};

export default async function TalentsListPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const talents = await getTalentsWithPhotos(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Talents ({talents.length})
        </h1>
        <Button asChild>
          <Link href="/admin/talents/new">+ เพิ่ม Talent</Link>
        </Button>
      </div>

      <TalentFilterPanel searchParams={params} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {talents.map((t) => (
          <Link
            key={t.id}
            href={`/admin/talents/${t.id}`}
            className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#1D4ED8]/40 hover:shadow-md"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
              {t.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getPhotoProxyUrl(t.photo_path)}
                  alt={t.nickname_th ?? ""}
                  loading="lazy"
                  className="size-full object-cover object-top transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                  ไม่มีรูป
                </div>
              )}
              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[t.status] ?? "bg-neutral-200 text-neutral-600"}`}
              >
                {STATUS_LABEL_TH[t.status] ?? t.status}
              </span>
            </div>
            <div className="space-y-1.5 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold text-neutral-800">
                  {t.nickname_th}
                  {t.nickname_en ? ` (${t.nickname_en})` : ""}
                </p>
                <span className="shrink-0 font-mono text-[10px] text-neutral-400">
                  {t.code}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {[
                  t.dob ? `${calculateAge(t.dob)} ปี` : null,
                  t.height_cm ? `${t.height_cm} ซม.` : null,
                  t.is_influencer ? (TIER_LABEL[t.tier] ?? t.tier) : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              <div className="flex flex-wrap gap-1">
                {t.is_model && (
                  <Badge className="bg-[#1D4ED8]/10 text-[10px] text-[#1D4ED8]">
                    Model
                  </Badge>
                )}
                {t.is_influencer && (
                  <Badge className="bg-[#B82233]/10 text-[10px] text-[#B82233]">
                    Influencer
                  </Badge>
                )}
                {t.is_ai_model && (
                  <Badge className="bg-gradient-to-r from-[#1D4ED8]/15 to-[#B82233]/15 text-[10px] text-[#5b2b8f]">
                    AI Model
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
        {talents.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed bg-white p-14 text-center text-neutral-400">
            ไม่พบ talent ที่ตรงกับตัวกรอง
          </p>
        )}
      </div>
    </div>
  );
}
