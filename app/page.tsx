import type { Metadata } from "next";
import Link from "next/link";
import { TalentGridCard } from "@/components/talent/TalentGridCard";
import { ageLabel } from "@/lib/age";
import { CONTACT } from "@/lib/constants";
import {
  getPublicTabCounts,
  getPublicTalentsPage,
  PUBLIC_PAGE_SIZE,
  type PublicTab,
} from "@/lib/public-talents";

export const metadata: Metadata = {
  title: "GAMDANG AGENCY — Modeling & Influencer Agency",
  description:
    "Gamdang Agency — เอเจนซี่ Model, Influencer และ AI Model ครบวงจร รับงานถ่ายแบบ โฆษณา และรีวิวสินค้า",
};

const TABS = [
  {
    key: "model" as PublicTab,
    label: "Model",
    active: "bg-[#1D4ED8] text-white shadow-md shadow-[#1D4ED8]/30",
    dot: "bg-[#1D4ED8]",
  },
  {
    key: "influencer" as PublicTab,
    label: "Influencer",
    active: "bg-[#B82233] text-white shadow-md shadow-[#B82233]/30",
    dot: "bg-[#B82233]",
  },
  {
    key: "ai" as PublicTab,
    label: "AI Model",
    active:
      "bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-white shadow-md shadow-[#5b2b8f]/30",
    dot: "bg-gradient-to-r from-[#1D4ED8] to-[#B82233]",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab: PublicTab = TABS.some((t) => t.key === rawTab)
    ? (rawTab as PublicTab)
    : "model";
  const page = Math.max(parseInt(rawPage ?? "1", 10) || 1, 1);

  const [{ talents, total }, counts] = await Promise.all([
    getPublicTalentsPage(tab, page),
    getPublicTabCounts(),
  ]);
  const totalPages = Math.max(Math.ceil(total / PUBLIC_PAGE_SIZE), 1);

  const pageHref = (p: number) =>
    `/?tab=${tab}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-base font-extrabold tracking-widest text-transparent">
            GAMDANG AGENCY
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/booking"
              className="rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              จองถ่ายโปรไฟล์ ✦
            </Link>
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              ติดต่อจ้างงาน
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-4 py-14 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
          Modeling &amp; Influencer Agency
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          GAMDANG AGENCY
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/80">
          รวม Model · Influencer · AI Model คุณภาพ พร้อมรับงานถ่ายแบบ โฆษณา
          และรีวิวสินค้า — คัดตัวที่ใช่สำหรับแบรนด์ของคุณ
        </p>
      </section>

      {/* Tabs */}
      <nav className="sticky top-[57px] z-10 border-b border-neutral-200 bg-neutral-50/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "model" ? "/" : `/?tab=${t.key}`}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? t.active
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300"
              }`}
            >
              {tab !== t.key && <span className={`size-2 rounded-full ${t.dot}`} />}
              {t.label}
              <span
                className={`text-xs font-normal ${tab === t.key ? "text-white/75" : "text-neutral-400"}`}
              >
                {counts[t.key]}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Cards */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {talents.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {talents.map((t) => (
              <TalentGridCard
                key={t.id}
                photoPath={t.photo_path}
                name={t.name}
                nameSub={t.nameSub}
                gender={t.gender}
                ageText={t.dob ? ageLabel(t.dob) : null}
                heightCm={t.height_cm}
                weightKg={t.weight_kg}
                nationality={t.nationality}
                roles={{ model: t.is_model, influ: t.is_influencer, ai: t.is_ai_model }}
                socials={tab === "influencer" ? t.socials : undefined}
                topFollower={tab === "influencer" ? t.top : undefined}
                characters={
                  tab === "ai" && t.character
                    ? t.character
                        .split("/")
                        .map((c) => c.trim())
                        .filter(Boolean)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
            Coming soon — เร็วๆ นี้
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                ← ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}
            <span className="text-neutral-400">
              หน้า {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                ถัดไป →
              </Link>
            )}
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-8 py-12 text-center text-white shadow-md">
          <h2 className="text-2xl font-bold sm:text-3xl">
            สนใจจ้างงาน Model / Influencer?
          </h2>
          <p className="mt-2 text-sm text-white/75">
            ทักมาคุยรายละเอียดงานได้เลย ทีมงานพร้อมคัดตัวที่ใช่ให้แบรนด์ของคุณ
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#06C755] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-[#06C755]">
                LINE
              </span>
              {CONTACT.lineId}
            </a>
            {CONTACT.websites.map((w) => (
              <a
                key={w.url}
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                {w.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} GAMDANG AGENCY — Modeling &amp; Influencer
        Agency · LINE Official: {CONTACT.lineId}
      </footer>
    </div>
  );
}
