import { Fragment } from "react";
import Link from "next/link";
import { getProject, getProjectTalents } from "@/actions/projects";
import { PrintButton } from "@/components/public/PrintButton";
import { PrintMiniCard } from "@/components/public/TalentCards";

import { CONTACT } from "@/lib/constants";

// การ์ดใหญ่ขึ้น (รูปคอมการ์ดเด่นขึ้น) → A4 แนวตั้ง 2 คอลัมน์ × 4 แถว
// = 8 ใบ/หน้า (เก็บจำนวนไว้เท่าที่พอดี ไม่ลดเยอะ ตามที่พี่ขอ)
const CARDS_PER_PAGE = 8;

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function ProjectPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, projectTalents] = await Promise.all([
    getProject(id),
    getProjectTalents(id),
  ]);
  const pages = chunk(projectTalents, CARDS_PER_PAGE);

  return (
    <div className="mx-auto max-w-[210mm]">
      <style>{`
        .pdf-cover {
          height: 275mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          /* margin:0 = คุมขอบเอง → ต้องตั้ง Margins: None ในกล่อง print ด้วย */
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .pdf-page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 12mm;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            break-after: page;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-page:last-child { break-after: auto; }
          /* หน้าปก: gradient เต็มหน้า (bg เติมทั้งกล่อง) แต่เว้นขอบให้ตัวอักษร */
          .pdf-cover { padding: 18mm !important; height: 297mm; min-height: 297mm; }
        }
      `}</style>

      <div className="no-print mb-4 space-y-2 rounded-lg border bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-700">
            ตัวอย่าง PDF: หน้าปก + {projectTalents.length} การ์ด ({pages.length}{" "}
            หน้า, 8 ใบ/หน้า)
          </p>
          <Link
            href={`/admin/projects/${id}`}
            className="shrink-0 text-sm font-medium text-[#1D4ED8] hover:underline"
          >
            ← กลับหน้าโปรเจกต์
          </Link>
        </div>
        <div className="rounded-md bg-[#1D4ED8]/5 px-3 py-2 text-xs leading-5 text-neutral-600">
          กดปุ่ม <strong>&quot;บันทึกเป็น PDF&quot;</strong> มุมขวาล่าง →
          ในกล่องพิมพ์ตั้งค่า 3 อย่างให้ถูกเพื่อไม่ให้ขนาดหน้าเพี้ยน:
          <span className="mt-1 block">
            ① <strong>ปลายทาง (Destination)</strong> = &quot;Save as PDF /
            บันทึกเป็น PDF&quot; · ② <strong>ระยะขอบ (Margins)</strong> =
            &quot;None / ไม่มี&quot; · ③ เปิด{" "}
            <strong>Background graphics / กราฟิกพื้นหลัง</strong> (ให้สีพื้น
            gradient ติด)
          </span>
        </div>
      </div>

      {/* ===== หน้าปก Report ===== */}
      <section className="pdf-page pdf-cover mb-6 flex flex-col justify-between rounded-lg bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] p-14 text-white shadow-sm">
        <div>
          <p className="text-xl font-extrabold tracking-[0.25em]">
            GAMDANG AGENCY
          </p>
          <p className="mt-1 text-xs tracking-widest text-white/60">
            MODELING &amp; INFLUENCER AGENCY
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
            Talent Proposal
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight">
            {project.name}
          </h1>
          <div className="mt-8 space-y-2 text-sm text-white/85">
            {project.client_name && (
              <p>
                <span className="text-white/55">Client:</span>{" "}
                <span className="font-semibold">{project.client_name}</span>
              </p>
            )}
            {project.shooting_date && (
              <p>
                <span className="text-white/55">Shooting Date:</span>{" "}
                <span className="font-semibold">
                  {new Date(project.shooting_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
            <p>
              <span className="text-white/55">Talents:</span>{" "}
              <span className="font-semibold">{projectTalents.length}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-white/25 pt-4">
          <p className="text-sm font-semibold">
            สนใจจองคิว / สอบถามรายละเอียด (Booking &amp; Enquiry) — LINE Official:{" "}
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
          <p className="mt-3 text-[11px] leading-5 text-white/60">
            จัดทำเมื่อ (Prepared){" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · เอกสารนี้เป็นความลับ ห้ามเผยแพร่ · ห้ามติดต่อ Model / Influencer
            โดยตรง — การจ้างงานทุกกรณีติดต่อผ่าน GAMDANG AGENCY เท่านั้น
          </p>
        </div>
      </section>

      {pages.length === 0 && (
        <p className="rounded-lg border border-dashed bg-white p-10 text-center text-neutral-400">
          ยังไม่มี talent ในโปรเจกต์นี้
        </p>
      )}

      {/* ===== หน้าการ์ด ===== */}
      {pages.map((pageTalents, pageIdx) => (
        <section
          key={pageIdx}
          className="pdf-page mb-6 rounded-lg border bg-white p-6 shadow-sm"
        >
          <header className="mb-4 flex items-end justify-between border-b-2 border-neutral-800 pb-3">
            <div>
              <p className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
                GAMDANG AGENCY
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-neutral-800">
                {project.name}
              </h2>
            </div>
            <p className="text-[10px] text-neutral-400">
              หน้า {pageIdx + 1}/{pages.length}
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {pageTalents.map((pt, idx) => {
              // หัวข้อ Role คั่นกลุ่ม (เต็มแถว) เมื่อ role เปลี่ยน — ลูกค้าแยกออก
              const prevRole = idx > 0 ? pageTalents[idx - 1].role_title : undefined;
              const showHeader = pt.role_title !== prevRole;
              return (
                <Fragment key={pt.id}>
                  {showHeader && (
                    <div
                      className="col-span-2 mt-1 rounded-md bg-[#B82233]/8 px-3 py-1.5 text-sm font-bold text-[#B82233] first:mt-0"
                      style={{
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      🎭 {pt.role_title ?? "ไม่ระบุ Role"}
                    </div>
                  )}
                  <PrintMiniCard pt={pt} />
                </Fragment>
              );
            })}
          </div>

          <footer className="mt-4 space-y-1.5 border-t border-neutral-200 pt-2.5 text-center">
            <p
              className="text-[11px] font-semibold text-neutral-700"
              style={{
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              สนใจจองคิว / สอบถาม — LINE Official:{" "}
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
              เอกสารนี้เป็นความลับ ห้ามเผยแพร่ · ห้ามติดต่อ Model / Influencer โดยตรง —
              การจ้างงานทุกกรณีติดต่อผ่าน GAMDANG AGENCY เท่านั้น
            </p>
          </footer>
        </section>
      ))}

      <PrintButton />
    </div>
  );
}
