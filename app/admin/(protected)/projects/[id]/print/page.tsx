import Link from "next/link";
import { getProject, getProjectTalents } from "@/actions/projects";
import { PrintButton } from "@/components/public/PrintButton";
import { PrintMiniCard } from "@/components/public/TalentCards";

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
        @media print {
          .no-print { display: none !important; }
          .pdf-page { break-after: page; box-shadow: none !important; border: none !important; margin: 0 !important; }
          .pdf-page:last-child { break-after: auto; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-white px-4 py-3">
        <p className="text-sm text-neutral-500">
          ตัวอย่างหน้า PDF ({projectTalents.length} การ์ด · {pages.length} หน้า) —
          กดปุ่ม &quot;บันทึกเป็น PDF&quot; แล้วเลือก Save as PDF
        </p>
        <Link
          href={`/admin/projects/${id}`}
          className="text-sm font-medium text-[#1D4ED8] hover:underline"
        >
          ← กลับหน้าโปรเจกต์
        </Link>
      </div>

      {pages.length === 0 && (
        <p className="rounded-lg border border-dashed bg-white p-10 text-center text-neutral-400">
          ยังไม่มี talent ในโปรเจกต์นี้
        </p>
      )}

      {pages.map((pageTalents, pageIdx) => (
        <section
          key={pageIdx}
          className="pdf-page mb-6 rounded-lg border bg-white p-6 shadow-sm"
        >
          {/* Page header */}
          <header className="mb-4 flex items-end justify-between border-b-2 border-neutral-800 pb-3">
            <div>
              <p className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-base font-extrabold tracking-widest text-transparent">
                GAMDANG AGENCY
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-neutral-800">
                {project.name}
              </h1>
              <p className="text-[11px] text-neutral-400">
                {[
                  project.client_name ? `ลูกค้า: ${project.client_name}` : null,
                  project.shooting_date
                    ? `Shooting: ${new Date(project.shooting_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
                    : null,
                  "Talent Proposal",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="text-[10px] text-neutral-400">
              หน้า {pageIdx + 1}/{pages.length}
            </p>
          </header>

          {/* 8 cards: 2 cols x 4 rows */}
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
