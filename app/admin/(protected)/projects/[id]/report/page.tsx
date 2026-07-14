import Link from "next/link";
import { getProject, getProjectTalents } from "@/actions/projects";
import { PrintButton } from "@/components/public/PrintButton";
import { calculateAge } from "@/lib/age";
import { CONTACT, ETHNICITIES, TIER_LABEL } from "@/lib/constants";
import { formatFollowers, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";

const ETHNICITY_LABEL: Record<string, string> = Object.fromEntries(
  ETHNICITIES.map((e) => [e.value, e.label]),
);

// Report ส่งลูกค้า (Save as PDF จาก Chrome — ลิงก์กดได้ทั้งหมด):
// - งาน influencer: Result Report รวมลิงก์โพสต์ผลงานของทุกคนที่ส่งมา
// - งาน model: Casting Report การ์ดคนที่ลูกค้าเลือก + รูปเพิ่ม 3 รูป +
//   ลิงก์ผลงานที่เคยทำ + คลิปแนะนำตัว
export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, projectTalents] = await Promise.all([
    getProject(id),
    getProjectTalents(id),
  ]);
  const isModel = project.project_type === "model";

  const hasContent = (pt: (typeof projectTalents)[number]) =>
    (pt.submission_links ?? []).length > 0 ||
    (pt.extra_photo_paths ?? []).length > 0 ||
    !!pt.intro_video_url;

  // model: เอาคนที่ลูกค้าเลือก (ถ้ายังไม่มีใครถูกเลือก ใช้คนที่ส่งข้อมูลมาแทน)
  // influ: ทุกคนที่ส่งลิงก์ผลงาน
  const selected = projectTalents.filter((pt) => pt.client_interested === true);
  const submitted = isModel
    ? selected.length > 0
      ? selected
      : projectTalents.filter(hasContent)
    : projectTalents.filter((pt) => (pt.submission_links ?? []).length > 0);

  const reportTitle = isModel ? "Casting Report 📸" : "Result Report 📊";

  return (
    <div className="mx-auto max-w-[210mm]">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .pdf-cover {
          height: 275mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .no-print { display: none !important; }
          .pdf-page { break-after: page; box-shadow: none !important; border: none !important; margin: 0 !important; border-radius: 0 !important; }
          .pdf-page:last-child { break-after: auto; }
          .report-block { break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-white px-4 py-3">
        <p className="text-sm text-neutral-500">
          {reportTitle}: {submitted.length} คน (จาก {projectTalents.length}{" "}
          คนในโปรเจกต์{isModel ? " — เอาเฉพาะที่ลูกค้าเลือก" : ""}) — กดปุ่ม
          &quot;บันทึกเป็น PDF&quot; แล้ว Save as PDF ใน Chrome
          ลิงก์กดได้ทั้งหมด
        </p>
        <Link
          href={`/admin/projects/${id}`}
          className="shrink-0 text-sm font-medium text-[#1D4ED8] hover:underline"
        >
          ← กลับหน้าโปรเจกต์
        </Link>
      </div>

      {/* ===== หน้าปก ===== */}
      <section className="pdf-page pdf-cover mb-6 flex flex-col justify-between rounded-lg bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] p-14 text-white shadow-sm">
        <div>
          <p className="text-xl font-extrabold tracking-[0.25em]">GAMDANG AGENCY</p>
          <p className="mt-1 text-xs tracking-widest text-white/60">
            MODELING &amp; INFLUENCER AGENCY
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
            {reportTitle}
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight">{project.name}</h1>
          <div className="mt-8 space-y-2 text-sm text-white/85">
            {project.client_name && (
              <p>
                <span className="text-white/55">Client:</span>{" "}
                <span className="font-semibold">{project.client_name}</span>
              </p>
            )}
            <p>
              <span className="text-white/55">
                {isModel ? "Models:" : "Influencers:"}
              </span>{" "}
              <span className="font-semibold">{submitted.length} คน</span>
            </p>
            {!isModel && (
              <p>
                <span className="text-white/55">Total Posts:</span>{" "}
                <span className="font-semibold">
                  {submitted.reduce(
                    (sum, pt) => sum + (pt.submission_links ?? []).length,
                    0,
                  )}{" "}
                  ลิงก์
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-white/25 pt-4">
          <p className="text-sm font-semibold">
            สอบถามเพิ่มเติม — LINE Official:{" "}
            <a href={CONTACT.lineUrl} className="underline underline-offset-2">
              {CONTACT.lineId}
            </a>
          </p>
          <p className="mt-0.5 space-x-3 text-xs text-white/80">
            {CONTACT.websites.map((w) => (
              <a key={w.url} href={w.url} className="underline underline-offset-2">
                {w.label}
              </a>
            ))}
          </p>
          <p className="mt-3 text-[11px] text-white/60">
            จัดทำเมื่อ{" "}
            {new Date().toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </section>

      {/* ===== เนื้อหารายงาน ===== */}
      <section className="pdf-page mb-6 rounded-lg border bg-white p-6 shadow-sm">
        <header className="mb-5 flex items-end justify-between border-b-2 border-neutral-800 pb-3">
          <div>
            <p className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
              GAMDANG AGENCY
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-800">
              {project.name} — {isModel ? "Casting Report" : "Result Report"}
            </h2>
          </div>
        </header>

        {submitted.length === 0 && (
          <p className="rounded-lg border border-dashed p-10 text-center text-neutral-400">
            {isModel
              ? "ยังไม่มีคนที่ลูกค้าเลือกหรือส่งข้อมูล casting — ใช้ปุ่ม \"📤 ขอส่งงานทาง LINE\" ในหน้าโปรเจกต์ก่อน"
              : "ยังไม่มีใครส่งลิงก์ผลงาน — ใช้ปุ่ม \"📤 ขอส่งงานทาง LINE\" ในหน้าโปรเจกต์ก่อน"}
          </p>
        )}

        <div className="space-y-4">
          {submitted.map((pt) => {
            const t = pt.talent;
            const displayName = t.nickname_en || t.nickname_th || t.code;
            const links: string[] = pt.submission_links ?? [];

            if (isModel) {
              // ===== การ์ด Casting (งาน Model) =====
              // ผลงาน/คลิปอ่านจาก record ของ talent (แหล่งถาวร) ก่อน แล้วค่อย
              // fallback ค่าที่ส่งเฉพาะโปรเจกต์
              const portfolioLinks: string[] =
                (t.portfolio_links ?? []).length > 0
                  ? t.portfolio_links
                  : links;
              const introVideo = t.intro_video_url ?? pt.intro_video_url ?? null;
              const mainImg = pt.compcard_path ?? pt.gallery_paths[0] ?? null;
              const extraPhotos: string[] = pt.extra_photo_paths ?? [];
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
                <div
                  key={pt.id}
                  className="report-block overflow-hidden rounded-xl border border-neutral-200"
                >
                  {mainImg && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(mainImg)}
                      alt={displayName}
                      className="max-h-64 w-full bg-neutral-50 object-contain"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-lg font-bold text-neutral-800">
                        {displayName}
                      </p>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {t.code}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ★ Client Selected
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {facts.join(" · ")}
                    </p>

                    {extraPhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {extraPhotos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p}
                            src={getPhotoProxyUrl(p)}
                            alt=""
                            className="aspect-[3/4] w-full rounded-lg border border-neutral-200 object-cover object-top"
                          />
                        ))}
                      </div>
                    )}

                    {introVideo && (
                      <p className="mt-3 text-sm">
                        <span className="font-semibold text-neutral-700">
                          🎬 คลิปแนะนำตัว:{" "}
                        </span>
                        <a
                          href={introVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[#1D4ED8] underline underline-offset-2"
                        >
                          {introVideo}
                        </a>
                      </p>
                    )}

                    {portfolioLinks.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          ผลงานที่ผ่านมา (Past Work)
                        </p>
                        <ul className="mt-1 space-y-1">
                          {portfolioLinks.map((link, li) => (
                            <li
                              key={li}
                              className="flex items-baseline gap-1.5 text-sm"
                            >
                              <span className="text-[11px] text-neutral-400">
                                {li + 1}.
                              </span>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-[#1D4ED8] underline underline-offset-2"
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pt.submission_note && (
                      <p className="mt-2 text-xs text-neutral-500">
                        หมายเหตุ: {pt.submission_note}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // ===== บล็อกผลงาน (งาน Influencer) =====
            const img = pt.gallery_paths[0] ?? pt.compcard_path ?? null;
            const top = topSocial(t);
            return (
              <div
                key={pt.id}
                className="report-block flex gap-4 rounded-xl border border-neutral-200 p-4"
              >
                <div className="size-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(img)}
                      alt={displayName}
                      className="size-full object-cover object-top"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-base font-bold text-neutral-800">
                      {displayName}
                    </p>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {t.code}
                    </span>
                    <span className="text-[11px] font-semibold text-[#1D4ED8]">
                      {TIER_LABEL[t.tier] ?? t.tier}
                    </span>
                    {top && (
                      <span className="text-[11px] text-neutral-500">
                        {formatFollowers(top.followers)} followers on {top.label}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {links.map((link, li) => (
                      <li key={li} className="flex items-baseline gap-1.5 text-sm">
                        <span className="text-[11px] text-neutral-400">
                          {li + 1}.
                        </span>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[#1D4ED8] underline underline-offset-2"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {pt.submission_note && (
                    <p className="mt-1.5 text-xs text-neutral-500">
                      หมายเหตุ: {pt.submission_note}
                    </p>
                  )}
                  {pt.submitted_at && (
                    <p className="mt-1 text-[10px] text-neutral-400">
                      ส่งเมื่อ{" "}
                      {new Date(pt.submitted_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-5 space-y-1.5 border-t border-neutral-200 pt-2.5 text-center">
          <p className="text-[11px] font-semibold text-neutral-700">
            สนใจงานถัดไป — LINE Official:{" "}
            <a href={CONTACT.lineUrl} className="text-[#06C755]">
              {CONTACT.lineId}
            </a>
            {CONTACT.websites.map((w) => (
              <span key={w.url}>
                {" · "}
                <a href={w.url} className="text-[#1D4ED8]">
                  {w.label}
                </a>
              </span>
            ))}
          </p>
          <p className="text-[9px] leading-4 text-neutral-400">
            เอกสารนี้เป็นความลับ จัดทำสำหรับลูกค้าโปรเจกต์นี้เท่านั้น · ©{" "}
            {new Date().getFullYear()} GAMDANG AGENCY
          </p>
        </footer>
      </section>

      <PrintButton />
    </div>
  );
}
