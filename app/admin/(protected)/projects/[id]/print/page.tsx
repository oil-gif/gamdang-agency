import Link from "next/link";
import { getProject, getProjectTalents } from "@/actions/projects";
import { PrintButton } from "@/components/public/PrintButton";
import { PrintMiniCard } from "@/components/public/TalentCards";

// การ์ดสูง ~40มม. → A4 แนวตั้ง (พื้นที่ใช้งาน ~277มม.) ใส่ได้เต็มที่ 5 แถว
// (10 ใบ/หน้า) แต่ตั้งไว้ 4 แถว = 8 ใบ/หน้า เพื่อให้มีระยะหายใจสวยงาม
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
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-white px-4 py-3">
        <p className="text-sm text-neutral-500">
          ตัวอย่าง PDF: หน้าปก + {projectTalents.length} การ์ด ({pages.length}{" "}
          หน้า, 8 ใบ/หน้า) — กดปุ่ม &quot;บันทึกเป็น PDF&quot; แล้วเลือก Save as PDF
        </p>
        <Link
          href={`/admin/projects/${id}`}
          className="shrink-0 text-sm font-medium text-[#1D4ED8] hover:underline"
        >
          ← กลับหน้าโปรเจกต์
        </Link>
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
                <span className="text-white/55">ลูกค้า / Client:</span>{" "}
                <span className="font-semibold">{project.client_name}</span>
              </p>
            )}
            {project.shooting_date && (
              <p>
                <span className="text-white/55">Shooting Date:</span>{" "}
                <span className="font-semibold">
                  {new Date(project.shooting_date).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
            <p>
              <span className="text-white/55">จำนวนที่นำเสนอ:</span>{" "}
              <span className="font-semibold">{projectTalents.length} Talents</span>
            </p>
          </div>
        </div>

        <div className="border-t border-white/25 pt-4 text-[11px] leading-5 text-white/60">
          <p>
            จัดทำเมื่อ{" "}
            {new Date().toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · เอกสารนี้เป็นความลับ ห้ามเผยแพร่
          </p>
          <p>
            ห้ามติดต่อ Model / Influencer โดยตรง — การจ้างงานทุกกรณีติดต่อผ่าน
            GAMDANG AGENCY เท่านั้น
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
            {pageTalents.map((pt) => (
              <PrintMiniCard key={pt.id} pt={pt} />
            ))}
          </div>

          <footer className="mt-4 border-t border-neutral-200 pt-2 text-center text-[9px] leading-4 text-neutral-400">
            เอกสารนี้เป็นความลับ ห้ามเผยแพร่ · ห้ามติดต่อ Model / Influencer โดยตรง —
            การจ้างงานทุกกรณีติดต่อผ่าน GAMDANG AGENCY เท่านั้น
          </footer>
        </section>
      ))}

      <PrintButton />
    </div>
  );
}
