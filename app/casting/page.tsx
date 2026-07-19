import type { Metadata } from "next";
import Link from "next/link";
import { BackToHome } from "@/components/BackToHome";
import { CONTACT } from "@/lib/constants";
import { getPublicCastings } from "@/lib/casting";
import { getPhotoProxyUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Casting Calls — GAMDANG AGENCY",
  description: "ประกาศรับสมัครนักแสดง นายแบบ นางแบบ อินฟลูเอนเซอร์ — งานโฆษณา หนัง ซีรีส์ MV",
};

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

type Filter = "open" | "closed" | "all";

const TABS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

export default async function CastingListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter =
    status === "closed" ? "closed" : status === "all" ? "all" : "open";

  const all = await getPublicCastings();
  const openCount = all.filter((c) => !c.casting_closed).length;
  const closedCount = all.length - openCount;
  const castings = all.filter((c) =>
    filter === "open" ? !c.casting_closed : filter === "closed" ? c.casting_closed : true,
  );

  const countFor = (k: Filter) =>
    k === "open" ? openCount : k === "closed" ? closedCount : all.length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
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
            Contact
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-extrabold text-neutral-800">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-transparent">
            Casting
          </span>{" "}
          calls
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Open casting calls — see a role you like? Tap to apply
        </p>

        {/* ตัวกรอง เปิดรับ / ปิดรับ / ทั้งหมด */}
        <div className="mt-5 inline-flex rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
          {TABS.map((t) => {
            const active = t.key === filter;
            return (
              <Link
                key={t.key}
                href={t.key === "open" ? "/casting" : `/casting?status=${t.key}`}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-white shadow"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
                <span
                  className={`ml-1.5 text-xs ${active ? "text-white/80" : "text-neutral-400"}`}
                >
                  {countFor(t.key)}
                </span>
              </Link>
            );
          })}
        </div>

        {castings.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {castings.map((c) => (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                {c.cover_path && (
                  <div className="relative aspect-[1200/630] bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPhotoProxyUrl(c.cover_path)}
                      alt=""
                      className={`size-full object-cover ${c.casting_closed ? "opacity-70 grayscale" : ""}`}
                    />
                    {c.casting_closed && (
                      <span className="absolute right-3 top-3 rotate-3 rounded bg-[#B82233] px-3 py-1 text-xs font-bold text-white shadow">
                        SORRY. CASTING CLOSED.
                      </span>
                    )}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    {c.category ? (
                      <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {c.category}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-neutral-400">
                      Updated {timeAgo(c.updated_at)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-neutral-800">{c.name}</h2>
                  {c.description && (
                    <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-neutral-500">
                      {c.description}
                    </p>
                  )}
                  <Link
                    href={`/casting/${c.id}`}
                    className={`mt-4 block rounded-xl py-3 text-center text-sm font-bold text-white transition ${
                      c.casting_closed
                        ? "bg-neutral-400"
                        : "bg-gradient-to-r from-[#1D4ED8] to-[#B82233] hover:opacity-95"
                    }`}
                  >
                    View project
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
            {filter === "closed"
              ? "No closed casting calls"
              : filter === "open"
                ? "No open casting calls at the moment"
                : "No casting calls yet"}{" "}
            — follow us on LINE: {CONTACT.lineId}
          </p>
        )}
      </main>
    </div>
  );
}
