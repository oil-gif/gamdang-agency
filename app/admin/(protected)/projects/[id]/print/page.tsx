import { Fragment } from "react";
import Link from "next/link";
import { getProject, getProjectTalents } from "@/actions/projects";
import { PrintButton } from "@/components/public/PrintButton";
import { PrintMiniCard } from "@/components/public/TalentCards";

import { CONTACT } from "@/lib/constants";
import { formatEnDate } from "@/lib/datetime";

// ===== แบ่งหน้า A4 =====
//
// เดิมตัดหน้าละ 8 ใบตายตัว ซึ่งพังเมื่อมีหัวข้อ Role คั่น เพราะ
//   (1) แถบหัวข้อ Role กินความสูงเพิ่ม
//   (2) Role ที่มีการ์ดจำนวนคี่ ทำให้เหลือช่องว่างครึ่งแถว แล้วหัวข้อถัดไป
//       ต้องขึ้นแถวใหม่ → 8 ใบกินพื้นที่ได้ถึง 5 แถว ไม่ใช่ 4 แถว
// ผลคือเนื้อหาล้นออกนอกกระดาษ บรรทัดท้าย footer เลยตกไปอยู่หน้าถัดไป
// = ได้หน้าว่างคั่นกลาง 1 หน้า (พี่เจอตอน Save เป็น PDF 2026-08-09)
//
// แก้เป็นตัดหน้าตาม "ความสูงจริง" โดยประมาณแทน — ตัวเลขเป็น px ที่ 96dpi
// (A4 สูง 297mm = 1122px) วัดจากคลาสที่ใช้จริงใน PrintMiniCard
const PAGE_BODY_PX = 860; // พื้นที่ใส่การ์ด = 1122 - padding 24mm - header - footer (เผื่อไว้ ~7mm)
const ROW_MODEL_PX = 166; // การ์ดงาน model 1 แถว: รูป h-32 (128) + p-3 (24) + border + gap-3 (12)
const ROW_INFLU_PX = 187; // การ์ดงาน influ สูงกว่า: กรอบ aspect-[3/4] w-28 = 149
const ROLE_HEADER_PX = 49; // แถบ "🎭 ชื่อ Role" 1 บรรทัด + mt-1 + gap
const ROLE_LINE_PX = 20; // ชื่อ Role ยาวจะตัดหลายบรรทัด (พี่ใส่ brief ทั้งก้อนเป็นชื่อ Role)
const ROLE_CHARS_PER_LINE = 80; // ความกว้างแถบ ~680px ที่ text-sm

type Paginatable = { role_title?: string | null; card_type?: string | null };

function paginateCards<T extends Paginatable>(list: T[]) {
  const rowPx = (pt: T) =>
    pt.card_type === "influcard" ? ROW_INFLU_PX : ROW_MODEL_PX;
  const headerPx = (pt: T) => {
    const lines = Math.ceil(
      (pt.role_title ?? "ไม่ระบุ Role").length / ROLE_CHARS_PER_LINE,
    );
    return ROLE_HEADER_PX + Math.max(0, lines - 1) * ROLE_LINE_PX;
  };

  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0; // ความสูงที่ใช้ไปในหน้านี้
  let inRow = 0; // มีการ์ดในแถวปัจจุบันกี่ใบ (0 = ต้องขึ้นแถวใหม่)
  let rowH = 0; // ความสูงของแถวปัจจุบันที่บวกเข้า used ไปแล้ว
  let lastRole: string | null | undefined;

  for (const pt of list) {
    const startsPage = page.length === 0;
    // การ์ดใบแรกของหน้าจะขึ้นหัวข้อ Role เสมอ (ตรงกับ showHeader ตอน render)
    const roleChanged = startsPage || pt.role_title !== lastRole;
    const startsRow = roleChanged || inRow === 0;

    let cost = roleChanged ? headerPx(pt) : 0;
    // ใบที่ 2 ของแถวไม่กินความสูงเพิ่ม เว้นแต่มันสูงกว่าเพื่อนร่วมแถว
    cost += startsRow ? rowPx(pt) : Math.max(0, rowPx(pt) - rowH);

    if (!startsPage && used + cost > PAGE_BODY_PX) {
      pages.push(page);
      page = [pt];
      used = headerPx(pt) + rowPx(pt);
      inRow = 1;
      rowH = rowPx(pt);
      lastRole = pt.role_title;
      continue;
    }

    page.push(pt);
    used += cost;
    if (startsRow) {
      inRow = 1;
      rowH = rowPx(pt);
    } else {
      inRow = 0;
      rowH = Math.max(rowH, rowPx(pt));
    }
    lastRole = pt.role_title;
  }
  if (page.length > 0) pages.push(page);
  return pages;
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
  const pages = paginateCards(projectTalents);

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
            /* 296 ไม่ใช่ 297 — กล่องสูงเท่ากระดาษเป๊ะจะล้นได้จากการปัดเศษ px
               (297mm = 1122.52px ไม่ลงตัว) แล้วเกิดหน้าว่างตามมา */
            min-height: 296mm;
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
          /* :last-child ใช้ไม่ได้ — ปุ่มพิมพ์เป็น child ตัวสุดท้ายของ container
             (ต่อให้ display:none ก็ยังนับเป็น child) หน้าสุดท้ายเลยยังมี
             break-after ค้างอยู่ → เสี่ยงได้หน้าว่างท้ายไฟล์ */
          .pdf-page:last-of-type { break-after: auto; }
          /* หน้าปก: gradient เต็มหน้า (bg เติมทั้งกล่อง) แต่เว้นขอบให้ตัวอักษร */
          .pdf-cover { padding: 18mm !important; height: 296mm; min-height: 296mm; }
        }
      `}</style>

      <div className="no-print mb-4 space-y-2 rounded-lg border bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-700">
            ตัวอย่าง PDF: หน้าปก + {projectTalents.length} การ์ด ={" "}
            {pages.length + 1} หน้า (ระบบตัดหน้าให้พอดี A4 อัตโนมัติ
            หน้าที่มีหัวข้อ Role หลายอันจะได้การ์ดน้อยลง)
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
          {/* โลโก้ Gamdang Modeling + Influencer วางติดกันบนการ์ดขาว */}
          <div
            className="inline-flex items-center gap-4 rounded-2xl bg-white px-5 py-3 shadow-sm"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gamdang-modeling.png"
              alt="GAMDANG Modeling Agency"
              className="h-14 w-auto"
              style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
            />
            <span className="h-12 w-px bg-neutral-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gamdang-influencer.png"
              alt="GAMDANG Influencer Agency"
              className="h-14 w-auto"
              style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
            />
          </div>
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
                  {formatEnDate(project.shooting_date, {
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
            {formatEnDate(new Date(), {
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
