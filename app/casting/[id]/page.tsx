import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyProfilesForCasting } from "@/actions/casting-apply";
import { CastingApply } from "@/components/casting/CastingApply";
import { CONTACT } from "@/lib/constants";
import { getPublicCasting } from "@/lib/casting";
import { SITE_URL } from "@/lib/site";
import { getPhotoProxyUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const BASE_URL = SITE_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const casting = await getPublicCasting(id);
  if (!casting) return { title: "Casting Call — GAMDANG AGENCY" };

  const title = `${casting.name} — Casting Call | GAMDANG AGENCY`;
  const description =
    casting.description?.slice(0, 200) ??
    "ประกาศรับสมัครนักแสดง นายแบบ นางแบบ — GAMDANG AGENCY";
  const image = casting.cover_path
    ? `${BASE_URL}${getPhotoProxyUrl(casting.cover_path)}`
    : undefined;
  const url = `${BASE_URL}/casting/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "GAMDANG AGENCY",
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CastingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const { id } = await params;
  const { applied, error } = await searchParams;
  const casting = await getPublicCasting(id);
  if (!casting) notFound();

  const { loggedIn, profiles } = await getMyProfilesForCasting(id);
  const shareUrl = `${BASE_URL}/casting/${id}`;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link
            href="/casting"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← งานทั้งหมด
          </Link>
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
            GAMDANG AGENCY
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {applied && (
          <div className="mb-5 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10 p-4 text-center text-sm font-semibold text-[#04863b]">
            ✓ ส่งใบสมัครเรียบร้อยแล้ว! ทีมงานจะติดต่อกลับผ่านช่องทางที่ให้ไว้
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        {casting.cover_path && (
          <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-2xl bg-neutral-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPhotoProxyUrl(casting.cover_path)}
              alt=""
              className="size-full object-cover"
            />
            {casting.casting_closed && (
              <span className="absolute right-4 top-4 rotate-3 rounded bg-[#B82233] px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                SORRY. CASTING CLOSED.
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          {casting.category && (
            <span className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-white">
              {casting.category}
            </span>
          )}
          {casting.shooting_date && (
            <span className="text-xs text-neutral-400">
              ถ่ายทำ: {casting.shooting_date}
            </span>
          )}
        </div>

        <h1 className="mt-2 text-3xl font-extrabold text-neutral-800">
          {casting.name}
        </h1>

        {casting.description && (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-neutral-600">
            {casting.description}
          </p>
        )}

        {casting.roles.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-neutral-800">
              Role ที่เปิดรับ ({casting.roles.length})
            </h2>
            <div className="mt-3 space-y-2.5">
              {casting.roles.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <p className="font-semibold text-neutral-800">{r.title}</p>
                  {r.description && (
                    <p className="mt-0.5 text-sm leading-6 text-neutral-500">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-neutral-200 pt-6">
          <CastingApply
            projectId={casting.id}
            roles={casting.roles.map((r) => ({ id: r.id, title: r.title }))}
            closed={casting.casting_closed}
            shareUrl={shareUrl}
            shareTitle={casting.name}
            loggedIn={loggedIn}
            profiles={profiles}
          />
        </div>

        <footer className="mt-10 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          GAMDANG AGENCY · ติดต่อ LINE {CONTACT.lineId}
        </footer>
      </main>
    </div>
  );
}
