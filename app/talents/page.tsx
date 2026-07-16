import type { Metadata } from "next";
import Link from "next/link";
import { getTalentsWithPhotos, type TalentFilters } from "@/actions/talents";
import { BackToHome } from "@/components/BackToHome";
import { TalentGridCard } from "@/components/talent/TalentGridCard";
import { ageLabel } from "@/lib/age";
import { CATEGORIES, CONTACT, ETHNICITIES, TALENTS_PAGE_SIZE } from "@/lib/constants";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";

export const metadata: Metadata = {
  title: "Our Talents — GAMDANG AGENCY",
  description: "ทาเลนต์ของ Gamdang Agency — Model, Influencer, AI Model กรองตามหมวด เพศ อายุ ส่วนสูง",
};

export const dynamic = "force-dynamic";

type RawParams = Record<string, string | undefined>;

const ROLE_TABS = [
  { key: "", label: "ทั้งหมด" },
  { key: "model", label: "Model" },
  { key: "influencer", label: "Influencer" },
  { key: "ai", label: "AI Model" },
] as const;

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
    tier: pick("tier"),
    category: pick("category"),
    ethnicity: pick("ethnicity"),
    minHeight: num("min_height"),
    maxHeight: num("max_height"),
    minAge: num("min_age"),
    maxAge: num("max_age"),
    // หน้าสาธารณะ: โชว์เฉพาะทาเลนต์ที่อนุมัติแล้วเท่านั้น
    status: "active",
  };
}

export default async function PublicTalentsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const role = filters.role ?? "";
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const { talents, total } = await getTalentsWithPhotos(filters, page);
  const totalPages = Math.max(Math.ceil(total / TALENTS_PAGE_SIZE), 1);

  // สร้างลิงก์โดยคงตัวกรองเดิม เปลี่ยนเฉพาะ key ที่ส่งมา (role / page)
  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const merged: RawParams = { ...params, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "any") sp.set(k, v);
    }
    const qs = sp.toString();
    return `/talents${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <BackToHome />
            <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-base font-extrabold tracking-widest text-transparent">
              GAMDANG AGENCY
            </span>
          </div>
          <a
            href={CONTACT.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white"
          >
            ติดต่อจ้างงาน
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-extrabold text-neutral-800">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-transparent">
            Our
          </span>{" "}
          Talents
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Model · Influencer · AI Model — เอาเมาส์ชี้ที่การ์ดเพื่อดูรายละเอียด
        </p>

        {/* แท็บบทบาท */}
        <div className="mt-5 flex flex-wrap gap-2">
          {ROLE_TABS.map((t) => {
            const active = role === t.key;
            return (
              <Link
                key={t.key}
                href={hrefWith({ role: t.key || undefined, page: undefined })}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-white shadow"
                    : "border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ตัวกรอง (GET form — คง role ปัจจุบันไว้) */}
        <details className="mt-4 rounded-2xl border border-neutral-200 bg-white" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-600">
            ตัวกรอง (Filters) — {total} คน
          </summary>
          <form
            method="get"
            className="grid grid-cols-2 gap-3 border-t border-neutral-100 p-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {role && <input type="hidden" name="role" value={role} />}
            <div className="col-span-2 space-y-1 sm:col-span-3 lg:col-span-1">
              <label htmlFor="q" className="text-xs font-medium text-neutral-500">
                ค้นหา (ชื่อเล่น / รหัส)
              </label>
              <input
                id="q"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="เช่น มิ้นท์"
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
              />
            </div>

            <Field label="เพศ" name="gender" value={params.gender}>
              <option value="any">ทั้งหมด</option>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่นๆ / LGBTQ+</option>
            </Field>

            <Field label="เชื้อชาติ" name="ethnicity" value={params.ethnicity}>
              <option value="any">ทั้งหมด</option>
              {ETHNICITIES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Field>

            <Field label="Category" name="category" value={params.category}>
              <option value="any">ทั้งหมด</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Field>

            <RangeField
              label="ส่วนสูง (ซม.)"
              minName="min_height"
              maxName="max_height"
              minVal={params.min_height}
              maxVal={params.max_height}
            />
            <RangeField
              label="อายุ (ปี)"
              minName="min_age"
              maxName="max_age"
              minVal={params.min_age}
              maxVal={params.max_age}
            />

            <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-4">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-5 py-2 text-sm font-semibold text-white"
              >
                กรอง
              </button>
              <Link
                href={role ? `/talents?role=${role}` : "/talents"}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500"
              >
                ล้างตัวกรอง
              </Link>
            </div>
          </form>
        </details>

        {/* กริดการ์ด */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {talents.map((t) => {
            const top = t.is_influencer ? topSocial(t) : null;
            return (
              <TalentGridCard
                key={t.id}
                photoPath={t.photo_path}
                name={t.nickname_th ?? t.nickname_en ?? "(ไม่มีชื่อ)"}
                nameSub={t.nickname_en && t.nickname_th ? t.nickname_en : null}
                code={t.code}
                gender={t.gender}
                ageText={t.dob ? ageLabel(t.dob) : null}
                heightCm={t.height_cm}
                weightKg={t.weight_kg}
                nationality={t.nationality ?? null}
                roles={{
                  model: t.is_model,
                  influ: t.is_influencer,
                  ai: t.is_ai_model === true,
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
            <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white p-14 text-center text-neutral-400">
              ยังไม่มีทาเลนต์ในหมวดนี้
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 text-sm">
            {page > 1 && (
              <Link
                href={hrefWith({ page: String(page - 1) })}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium"
              >
                ← ก่อนหน้า
              </Link>
            )}
            <span className="text-neutral-400">
              หน้า {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={hrefWith({ page: String(page + 1) })}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium"
              >
                ถัดไป →
              </Link>
            )}
          </div>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          สนใจจ้างทาเลนต์? ติดต่อ GAMDANG AGENCY · LINE {CONTACT.lineId}
        </footer>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-xs font-medium text-neutral-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={value ?? "any"}
        className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-2 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function RangeField({
  label,
  minName,
  maxName,
  minVal,
  maxVal,
}: {
  label: string;
  minName: string;
  maxName: string;
  minVal?: string;
  maxVal?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <div className="flex items-center gap-1">
        <input
          name={minName}
          type="number"
          defaultValue={minVal ?? ""}
          placeholder="ต่ำ"
          className="h-10 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
        <span className="text-neutral-400">–</span>
        <input
          name={maxName}
          type="number"
          defaultValue={maxVal ?? ""}
          placeholder="สูง"
          className="h-10 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </div>
    </div>
  );
}
