import Link from "next/link";
import { getTalentsWithPhotos, type TalentFilters } from "@/actions/talents";
import { Button } from "@/components/ui/button";
import { TalentFilterPanel } from "@/components/admin/TalentFilterPanel";
import { TalentGridCard } from "@/components/talent/TalentGridCard";
import { STATUS_LABEL_TH, TALENTS_PAGE_SIZE } from "@/lib/constants";
import { calculateAge } from "@/lib/age";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";

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
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const { talents, total } = await getTalentsWithPhotos(filters, page);
  const totalPages = Math.max(Math.ceil(total / TALENTS_PAGE_SIZE), 1);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => v && k !== "page") as [
        string,
        string,
      ][],
    );
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/talents${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Talents ({total})
        </h1>
        <Button asChild>
          <Link href="/admin/talents/new">+ เพิ่ม Talent</Link>
        </Button>
      </div>

      <TalentFilterPanel searchParams={params} />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {talents.map((t) => {
          const top = t.is_influencer ? topSocial(t) : null;
          return (
            <TalentGridCard
              key={t.id}
              href={`/admin/talents/${t.id}`}
              photoPath={t.photo_path}
              name={t.nickname_th ?? t.nickname_en ?? "(ไม่มีชื่อ)"}
              nameSub={t.nickname_en && t.nickname_th ? t.nickname_en : null}
              code={t.code}
              gender={t.gender}
              age={t.dob ? calculateAge(t.dob) : null}
              roles={{
                model: t.is_model,
                influ: t.is_influencer,
                ai: t.is_ai_model === true,
              }}
              statusChip={{
                label: STATUS_LABEL_TH[t.status] ?? t.status,
                className: STATUS_CHIP[t.status] ?? "bg-neutral-200 text-neutral-600",
              }}
              socials={
                t.is_influencer
                  ? talentSocials(t).map((s) => ({
                      key: s.key,
                      short: s.short,
                      color: s.color,
                      url: s.url,
                      followers: s.followers,
                    }))
                  : undefined
              }
              topFollower={
                top
                  ? {
                      short: top.short,
                      color: top.color,
                      count: formatFollowers(top.followers),
                    }
                  : null
              }
              characters={
                t.is_ai_model && t.character
                  ? (t.character as string)
                      .split("/")
                      .map((c: string) => c.trim())
                      .filter(Boolean)
                  : undefined
              }
            />
          );
        })}
        {talents.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed bg-white p-14 text-center text-neutral-400">
            ไม่พบ talent ที่ตรงกับตัวกรอง
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>← ก่อนหน้า</Link>
            </Button>
          )}
          <span className="text-neutral-400">
            หน้า {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>ถัดไป →</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
