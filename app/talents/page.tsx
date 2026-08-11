import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import {
  getPublicTalentCounts,
  getPublicTalents,
  type TalentFilters,
} from "@/actions/talents";
import { BackToHome } from "@/components/BackToHome";
import { TalentGridCard } from "@/components/talent/TalentGridCard";
import { ageLabel } from "@/lib/age";
import {
  CATEGORIES,
  CONTACT,
  ETHNICITIES,
  SHOW_TALENT_STATS,
  TALENTS_PAGE_SIZE,
} from "@/lib/constants";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";

export const metadata: Metadata = {
  title: "Our Talents — GAMDANG AGENCY",
  description: "ทาเลนต์ของ Gamdang Agency — Model, Influencer, AI Model กรองตามหมวด เพศ อายุ ส่วนสูง",
};

export const dynamic = "force-dynamic";

type RawParams = Record<string, string | undefined>;

const ROLE_TABS = [
  { key: "", label: "All" },
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
  // ปิดแถบตัวเลขอยู่ = ไม่ต้องยิง query นับเลย (ดู SHOW_TALENT_STATS)
  const [{ talents, total }, counts] = await Promise.all([
    getPublicTalents(filters, page),
    SHOW_TALENT_STATS ? getPublicTalentCounts() : null,
  ]);
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
            <BackToHome label="Back to Home" />
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
            Contact / Hire
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* ===== Hero: บอกว่าเราเป็นใคร + ตัวเลขจริงสร้างความน่าเชื่อถือ ===== */}
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-6 py-9 text-white sm:px-10 sm:py-11">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
              Modeling &amp; Influencer Agency
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Our Talents
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              Browse our roster of Models, Influencers and AI Models. Filter by
              gender, age, height, ethnicity or category — hover any card to see
              full details.
            </p>
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm transition hover:bg-white/90"
            >
              Book a talent — LINE {CONTACT.lineId}
            </a>
          </div>

          {/* แถบตัวเลข: นับจากฐานข้อมูลจริง ไม่ใช่ตัวเลขปั้น
              ซ่อนอยู่จนกว่าจะย้ายฐานข้อมูลเสร็จ — เปิดกลับที่ SHOW_TALENT_STATS */}
          {SHOW_TALENT_STATS && counts && (
            <dl className="grid grid-cols-2 divide-neutral-200 border-t border-neutral-200 sm:grid-cols-4 sm:divide-x">
              {[
                { label: "Talents", value: counts.total },
                { label: "Models", value: counts.model },
                { label: "Influencers", value: counts.influencer },
                { label: "AI Models", value: counts.ai },
              ].map((s) => (
                <div key={s.label} className="px-6 py-4 text-center">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 text-2xl font-extrabold text-neutral-800">
                    {s.value.toLocaleString("en-US")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* ===== กำลังย้ายฐานข้อมูลจากระบบเดิม — บอกลูกค้าว่าที่เห็นยังไม่ครบ ===== */}
        <section className="mt-4 rounded-2xl border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 px-5 py-4">
          <p className="text-sm font-bold text-[#1D4ED8]">
            We&apos;re still migrating our full talent database
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            The profiles shown here are the ones already moved over from our
            previous system at{" "}
            <a
              href="https://www.gamdang.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#1D4ED8] underline underline-offset-2"
            >
              www.gamdang.com
            </a>
            . We have many more talents available — for the complete roster or a
            tailored shortlist for your job, please contact our Official LINE{" "}
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#06C755] underline underline-offset-2"
            >
              {CONTACT.lineId}
            </a>
            .
          </p>
          <p className="mt-1.5 text-xs leading-5 text-neutral-500">
            (ขณะนี้เรากำลังทยอยย้ายฐานข้อมูลทาเลนต์จากระบบเดิม www.gamdang.com
            — ยังมีทาเลนต์อีกจำนวนมากที่ยังไม่ขึ้นหน้านี้ หากต้องการดูทั้งหมด
            หรือให้ทีมงานคัดให้ตรงกับงาน ทักไลน์ {CONTACT.lineId} ได้เลยค่ะ)
          </p>
        </section>

        {/* แท็บบทบาท */}
        <div className="mt-6 flex flex-wrap gap-2">
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
        <details
          className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
          open
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <span>Filters</span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
              {total.toLocaleString("en-US")} result{total === 1 ? "" : "s"}
            </span>
          </summary>
          <form
            method="get"
            className="grid grid-cols-2 gap-3 border-t border-neutral-100 p-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {role && <input type="hidden" name="role" value={role} />}
            <div className="col-span-2 space-y-1 sm:col-span-3 lg:col-span-1">
              <label htmlFor="q" className="text-xs font-medium text-neutral-500">
                Search (nickname / code)
              </label>
              <input
                id="q"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="e.g. Mint"
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
              />
            </div>

            <Field label="Gender" name="gender" value={params.gender}>
              <option value="any">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / LGBTQ+</option>
            </Field>

            <Field label="Ethnicity" name="ethnicity" value={params.ethnicity}>
              <option value="any">All</option>
              {ETHNICITIES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Field>

            <Field label="Category" name="category" value={params.category}>
              <option value="any">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Field>

            <RangeField
              label="Height (cm)"
              minName="min_height"
              maxName="max_height"
              minVal={params.min_height}
              maxVal={params.max_height}
            />
            <RangeField
              label="Age (yr)"
              minName="min_age"
              maxName="max_age"
              minVal={params.min_age}
              maxVal={params.max_age}
            />

            <div className="col-span-2 flex items-end gap-2 border-t border-neutral-100 pt-4 sm:col-span-3 lg:col-span-4">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Apply Filters
              </button>
              <Link
                href={role ? `/talents?role=${role}` : "/talents"}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50"
              >
                Clear
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
                name={t.nickname_en ?? t.nickname_th ?? "(ไม่มีชื่อ)"}
                nameSub={t.nickname_en && t.nickname_th ? t.nickname_th : null}
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
            <div className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <p className="text-sm font-semibold text-neutral-600">
                No talents match these filters
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-neutral-500">
                Not everyone is on this page yet — we&apos;re still migrating
                profiles from our previous system. Tell us what you need and our
                team will shortlist talents for you.
              </p>
              <a
                href={CONTACT.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Ask us on LINE {CONTACT.lineId}
              </a>
            </div>
          )}
        </div>

        <div className="pt-6">
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => hrefWith({ page: String(p) })}
          />
        </div>

        {/* ===== ปิดท้ายด้วย CTA ชัดๆ — ลูกค้าเลื่อนมาถึงล่างสุดต้องรู้ว่าติดต่อยังไง ===== */}
        <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-6 py-9 text-center text-white sm:px-10">
          <h2 className="text-xl font-extrabold sm:text-2xl">
            Can&apos;t find the right face?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/80">
            Our full roster is larger than what&apos;s listed here. Send us your
            brief — casting requirements, age range, look and shooting date —
            and we&apos;ll shortlist talents for you, usually the same day.
          </p>
          <a
            href={CONTACT.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1D4ED8] shadow-sm transition hover:bg-white/90"
          >
            Contact Official LINE {CONTACT.lineId}
          </a>
          <p className="mt-4 text-xs text-white/60">
            {CONTACT.websites.map((w, i) => (
              <span key={w.url}>
                {i > 0 && " · "}
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  {w.label}
                </a>
              </span>
            ))}
          </p>
        </section>

        <footer className="mt-8 border-t border-neutral-200 pt-6 text-center text-xs leading-5 text-neutral-400">
          © GAMDANG AGENCY — Modeling &amp; Influencer Agency · All talents are
          represented exclusively through the agency; please do not contact
          talents directly.
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
          placeholder="Min"
          className="h-10 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
        <span className="text-neutral-400">–</span>
        <input
          name={maxName}
          type="number"
          defaultValue={maxVal ?? ""}
          placeholder="Max"
          className="h-10 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </div>
    </div>
  );
}
