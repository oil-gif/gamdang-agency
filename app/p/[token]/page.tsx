import type { Metadata } from "next";
import { getProjectTalents } from "@/actions/projects";
import { acceptProjectLinkTC } from "@/actions/public-link";
import { PrintButton } from "@/components/public/PrintButton";
import { calculateAge } from "@/lib/age";
import { ETHNICITIES, TIER_LABEL } from "@/lib/constants";
import { bumpViewCount, getLinkWithProject } from "@/lib/public-link";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Talent Proposal — GAMDANG AGENCY",
  robots: { index: false, follow: false },
};

const ETHNICITY_LABEL: Record<string, string> = Object.fromEntries(
  ETHNICITIES.map((e) => [e.value, e.label]),
);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-lg font-extrabold tracking-widest text-transparent">
          GAMDANG AGENCY
        </p>
        {children}
      </div>
    </div>
  );
}

export default async function ClientPortfolioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getLinkWithProject(token);

  if (!link || !link.project) {
    return (
      <Shell>
        <h1 className="mt-4 text-xl font-bold text-neutral-800">ไม่พบลิงก์นี้</h1>
        <p className="mt-2 text-sm text-neutral-500">
          ลิงก์อาจพิมพ์ผิดหรือถูกลบไปแล้ว กรุณาติดต่อ Gamdang Agency
        </p>
      </Shell>
    );
  }

  const expired = link.expires_at && new Date(link.expires_at) < new Date();
  if (link.status !== "active" || expired) {
    return (
      <Shell>
        <h1 className="mt-4 text-xl font-bold text-neutral-800">
          ลิงก์นี้หมดอายุแล้ว
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          กรุณาติดต่อ Gamdang Agency เพื่อขอลิงก์ใหม่
        </p>
      </Shell>
    );
  }

  const project = link.project;

  // ===== T&C gate =====
  if (!link.tc_accepted) {
    return (
      <Shell>
        <p className="mt-1 text-xs text-neutral-400">Talent Proposal</p>
        <h1 className="mt-3 text-2xl font-bold text-neutral-800">{project.name}</h1>
        {project.client_name && (
          <p className="mt-1 text-sm text-neutral-500">สำหรับ {project.client_name}</p>
        )}
        <div className="mt-6 max-h-56 space-y-3 overflow-y-auto rounded-xl border bg-neutral-50 p-4 text-left text-sm leading-6 text-neutral-600">
          <p className="font-semibold text-neutral-800">
            เงื่อนไขการเข้าชม (Terms &amp; Conditions)
          </p>
          <p>
            1. ข้อมูลและรูปภาพทั้งหมดในเอกสารนี้เป็นทรัพย์สินของ Gamdang Agency
            จัดทำขึ้นเพื่อประกอบการพิจารณาคัดเลือกนักแสดง/อินฟลูเอนเซอร์สำหรับโปรเจกต์นี้เท่านั้น
          </p>
          <p>
            2. ห้ามคัดลอก ทำซ้ำ เผยแพร่ หรือส่งต่อให้บุคคลภายนอกโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
          </p>
          <p>
            3. การติดต่อจ้างงานนักแสดง/อินฟลูเอนเซอร์ในเอกสารนี้ ต้องดำเนินการผ่าน Gamdang Agency เท่านั้น
          </p>
          <p className="text-xs text-neutral-400">
            All information and photos are the property of Gamdang Agency, provided
            solely for talent selection on this project. Copying, sharing, or
            contacting talents directly is prohibited. Booking must be arranged
            through Gamdang Agency only.
          </p>
        </div>
        <form action={acceptProjectLinkTC} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            ยอมรับเงื่อนไขและเข้าชม (Accept &amp; View)
          </button>
        </form>
        <p className="mt-3 text-xs text-neutral-400">
          ระบบจะบันทึกเวลาและ IP address เมื่อกดยอมรับ
        </p>
      </Shell>
    );
  }

  // ===== Portfolio =====
  const projectTalents = await getProjectTalents(project.id);
  await bumpViewCount(link.id, link.view_count);

  return (
    <div className="min-h-screen bg-neutral-100 pb-16">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur print:static">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
            GAMDANG AGENCY
          </span>
          <span className="truncate pl-4 text-sm font-medium text-neutral-600">
            {project.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 pt-8">
        {/* Cover */}
        <section className="print-break overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-8 py-12 text-white shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            Talent Proposal
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{project.name}</h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {project.client_name && (
              <span className="rounded-full bg-white/15 px-3 py-1">
                ลูกค้า: {project.client_name}
              </span>
            )}
            {project.shooting_date && (
              <span className="rounded-full bg-white/15 px-3 py-1">
                Shooting:{" "}
                {new Date(project.shooting_date).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
            <span className="rounded-full bg-white/15 px-3 py-1">
              {projectTalents.length} Talents
            </span>
          </div>
          <p className="mt-8 text-xs text-white/60">
            Presented by GAMDANG AGENCY — Modeling &amp; Influencer Agency
          </p>
        </section>

        {/* Talent cards */}
        {projectTalents.map((pt, i) => {
          const t = pt.talent;
          const displayName = t.nickname_en || t.nickname_th || t.code;

          if (pt.card_type === "compcard") {
            const img = pt.compcard_path ?? pt.gallery_paths[0] ?? null;
            const facts = [
              t.dob ? `อายุ ${calculateAge(t.dob)} ปี` : null,
              t.height_cm ? `สูง ${t.height_cm} ซม.` : null,
              t.weight_kg ? `หนัก ${t.weight_kg} กก.` : null,
              (t.ethnicities ?? []).length > 0
                ? (t.ethnicities as string[])
                    .map((e) => ETHNICITY_LABEL[e] ?? e)
                    .join(" / ")
                : null,
            ].filter(Boolean) as string[];

            return (
              <article
                key={pt.id}
                className="print-break overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPhotoProxyUrl(img)}
                    alt={displayName}
                    className={
                      pt.compcard_path
                        ? "w-full object-cover"
                        : "max-h-[520px] w-full object-cover"
                    }
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                    ไม่มีรูป
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-5">
                  <div className="mr-auto">
                    <h2 className="text-xl font-bold text-neutral-800">
                      {String(i + 1).padStart(2, "0")} · {displayName}
                    </h2>
                    {t.nickname_en && t.nickname_th && (
                      <p className="text-sm text-neutral-400">{t.nickname_th}</p>
                    )}
                  </div>
                  {facts.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </article>
            );
          }

          // ===== Influ card =====
          const img = pt.gallery_paths[0] ?? pt.compcard_path ?? null;
          const top = topSocial(t);
          const socials = talentSocials(t);

          return (
            <article
              key={pt.id}
              className="print-break overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:flex"
            >
              <div className="sm:w-2/5">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPhotoProxyUrl(img)}
                    alt={displayName}
                    className="aspect-square w-full object-cover sm:h-full"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                    ไม่มีรูป
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-neutral-800">
                      {String(i + 1).padStart(2, "0")} · {displayName}
                    </h2>
                    <span className="rounded-full bg-[#B82233]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B82233]">
                      {TIER_LABEL[t.tier] ?? t.tier}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-400">
                    {t.nickname_en && t.nickname_th ? `${t.nickname_th} · ` : ""}
                    {t.dob ? `อายุ ${calculateAge(t.dob)} ปี` : ""}
                  </p>
                </div>

                {top && (
                  <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: top.color }}
                    >
                      {top.short}
                    </span>
                    <div>
                      <p className="text-lg font-bold leading-tight text-neutral-800">
                        {formatFollowers(top.followers)}
                      </p>
                      <p className="text-xs text-neutral-400">
                        followers on {top.label}
                      </p>
                    </div>
                  </div>
                )}

                {(t.categories ?? []).length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Expertise
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(t.categories as string[]).map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-[#1D4ED8]/25 bg-[#1D4ED8]/5 px-2.5 py-0.5 text-xs font-medium text-[#1D4ED8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {socials.length > 0 && (
                  <div className="mt-auto">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Social Channels
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {socials.map((s) => (
                        <a
                          key={s.key}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-full border border-neutral-200 py-1 pl-1 pr-3 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                        >
                          <span
                            className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: s.color }}
                          >
                            {s.short}
                          </span>
                          {s.label}
                          {s.followers > 0 && (
                            <span className="text-neutral-400">
                              {formatFollowers(s.followers)}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {projectTalents.length === 0 && (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-neutral-400">
            ยังไม่มี talent ในโปรเจกต์นี้
          </p>
        )}

        <footer className="pt-4 text-center text-xs leading-5 text-neutral-400">
          เอกสารนี้เป็นความลับ จัดทำเพื่อการพิจารณาคัดเลือกในโปรเจกต์นี้เท่านั้น
          ห้ามเผยแพร่ต่อ · การจ้างงานทุกกรณีต้องติดต่อผ่าน GAMDANG AGENCY
          <br />© {new Date().getFullYear()} GAMDANG AGENCY — Modeling &amp;
          Influencer Agency
        </footer>
      </main>

      <PrintButton />
    </div>
  );
}
