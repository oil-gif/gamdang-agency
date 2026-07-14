import type { Metadata } from "next";
import { getProjectTalents } from "@/actions/projects";
import { acceptProjectLinkTC } from "@/actions/public-link";
import { InfluCard, ModelCard } from "@/components/public/TalentCards";
import { CONTACT } from "@/lib/constants";
import { bumpViewCount, getLinkWithProject } from "@/lib/public-link";

export const metadata: Metadata = {
  title: "Talent Proposal — GAMDANG AGENCY",
  robots: { index: false, follow: false },
};

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
        <div className="mt-6 max-h-60 space-y-3 overflow-y-auto rounded-xl border bg-neutral-50 p-4 text-left text-sm leading-6 text-neutral-600">
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
          <p className="font-medium text-[#B82233]">
            3. ไม่อนุญาตให้ติดต่อ Model / Influencer โดยตรงทุกช่องทาง
            (รวมถึงการทัก DM หรือติดต่อผ่านโซเชียลมีเดียส่วนตัว)
            การติดต่อสอบถามหรือจ้างงานทุกกรณี ต้องดำเนินการผ่าน Gamdang Agency เท่านั้น
          </p>
          <p>
            4. การกด &quot;ยอมรับ&quot; ถือว่าท่านตกลงตามเงื่อนไขข้างต้นทั้งหมด
          </p>
          <p className="text-xs text-neutral-400">
            All information and photos are the property of Gamdang Agency, provided
            solely for talent selection on this project. Copying or sharing is
            prohibited. Contacting models/influencers directly through any channel
            (including social media DMs) is strictly prohibited — all inquiries and
            bookings must go through Gamdang Agency only.
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

  const influTalents = projectTalents.filter((pt) => pt.card_type === "influcard");
  const modelTalents = projectTalents.filter((pt) => pt.card_type === "compcard");

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
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
            GAMDANG AGENCY
          </span>
          <span className="truncate pl-4 text-sm font-medium text-neutral-600">
            {project.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-8">
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

        {/* Model comp cards — full width */}
        {modelTalents.map((pt) => (
          <ModelCard key={pt.id} pt={pt} />
        ))}

        {/* Influencer cards — compact grid */}
        {influTalents.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {influTalents.map((pt) => (
              <InfluCard key={pt.id} pt={pt} />
            ))}
          </div>
        )}

        {projectTalents.length === 0 && (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-neutral-400">
            ยังไม่มี talent ในโปรเจกต์นี้
          </p>
        )}

        {/* CTA ติดต่อ agency */}
        <section className="print-break overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] px-8 py-10 text-center text-white shadow-md">
          <h2 className="text-2xl font-bold">สนใจจองคิว / สอบถามรายละเอียด</h2>
          <p className="mt-2 text-sm text-white/75">
            การติดต่อและจ้างงานทุกกรณี ดำเนินการผ่าน GAMDANG AGENCY เท่านั้น
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#06C755] px-6 py-3 font-semibold text-white shadow-sm transition hover:opacity-90"
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
                className="rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              >
                {w.label}
              </a>
            ))}
          </div>
        </section>

        <footer className="pt-4 text-center text-xs leading-5 text-neutral-400">
          เอกสารนี้เป็นความลับ จัดทำเพื่อการพิจารณาคัดเลือกในโปรเจกต์นี้เท่านั้น
          ห้ามเผยแพร่ต่อ · ห้ามติดต่อ Model / Influencer โดยตรง —
          การจ้างงานทุกกรณีต้องติดต่อผ่าน GAMDANG AGENCY
          <br />© {new Date().getFullYear()} GAMDANG AGENCY — Modeling &amp;
          Influencer Agency
        </footer>
      </main>
    </div>
  );
}
