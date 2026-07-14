import type { Metadata } from "next";
import Link from "next/link";
import { calculateAge } from "@/lib/age";
import { CONTACT } from "@/lib/constants";
import { getPublicTalents, type PublicTalent } from "@/lib/public-talents";
import { getPhotoProxyUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "GAMDANG AGENCY — Modeling & Influencer Agency",
  description:
    "Gamdang Agency — เอเจนซี่ Model, Influencer และ AI Model ครบวงจร รับงานถ่ายแบบ โฆษณา และรีวิวสินค้า",
};

const TABS = [
  {
    key: "model",
    label: "Model",
    active: "bg-[#1D4ED8] text-white shadow-md shadow-[#1D4ED8]/30",
    dot: "bg-[#1D4ED8]",
  },
  {
    key: "influencer",
    label: "Influencer",
    active: "bg-[#B82233] text-white shadow-md shadow-[#B82233]/30",
    dot: "bg-[#B82233]",
  },
  {
    key: "ai",
    label: "AI Model",
    active:
      "bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-white shadow-md shadow-[#5b2b8f]/30",
    dot: "bg-gradient-to-r from-[#1D4ED8] to-[#B82233]",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function TalentCard({ talent, tab }: { talent: PublicTalent; tab: TabKey }) {
  const age = talent.dob ? calculateAge(talent.dob) : null;
  const characters =
    tab === "ai" && talent.character
      ? talent.character
          .split("/")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-200 shadow-sm">
      {talent.photo_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getPhotoProxyUrl(talent.photo_path)}
          alt={talent.name}
          loading="lazy"
          className="size-full object-cover object-top transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-neutral-400">
          Coming soon
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-14">
        <p className="text-lg font-bold leading-tight text-white">{talent.name}</p>
        {age !== null && <p className="text-xs text-white/75">Age {age}</p>}
        {characters.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {characters.map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab)
    ? (rawTab as TabKey)
    : "model";

  const all = await getPublicTalents();
  const byTab: Record<TabKey, PublicTalent[]> = {
    model: all.filter((t) => t.is_model),
    influencer: all.filter((t) => t.is_influencer),
    ai: all.filter((t) => t.is_ai_model),
  };
  const talents = byTab[tab];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-base font-extrabold tracking-widest text-transparent">
            GAMDANG AGENCY
          </span>
          <a
            href={CONTACT.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            ติดต่อจ้างงาน
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-4 py-16 text-center text-white">
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
              {tab !== t.key && (
                <span className={`size-2 rounded-full ${t.dot}`} />
              )}
              {t.label}
              <span
                className={`text-xs font-normal ${tab === t.key ? "text-white/75" : "text-neutral-400"}`}
              >
                {byTab[t.key].length}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Cards */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        {talents.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {talents.map((t) => (
              <TalentCard key={t.id} talent={t} tab={tab} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
            Coming soon — เร็วๆ นี้
          </p>
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
