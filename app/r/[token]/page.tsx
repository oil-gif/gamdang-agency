import type { Metadata } from "next";
import { CastingReportView } from "@/components/report/CastingReportView";
import { bumpViewCount, getLinkWithProject } from "@/lib/public-link";
import { CONTACT } from "@/lib/constants";

// Casting/Result Report ที่ลูกค้าเปิดดูเอง — ใช้ token ใบเดียวกับลิงก์เสนอ
// ทาเลนต์ (/p/[token]) เพราะเป็นลูกค้าคนเดียวกันของงานเดียวกัน · เงื่อนไขการ
// เข้าถึงชุดเดียวกัน: ลิงก์ต้อง active + ยังไม่หมดอายุ + ยอมรับ T&C แล้ว
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Casting Report — GAMDANG AGENCY",
  robots: { index: false, follow: false }, // ห้าม Google เก็บลิงก์ลูกค้า
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
          GAMDANG AGENCY
        </p>
        {children}
        <p className="mt-6 text-xs text-neutral-400">
          ติดต่อ LINE Official {CONTACT.lineId}
        </p>
      </div>
    </div>
  );
}

export default async function ClientReportPage({
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

  // ยังไม่ยอมรับเงื่อนไข → ให้ไปกดที่หน้าเสนอทาเลนต์ก่อน (หน้าเดียวที่มีปุ่มยอมรับ)
  if (!link.tc_accepted) {
    return (
      <Shell>
        <h1 className="mt-4 text-xl font-bold text-neutral-800">
          กรุณายอมรับเงื่อนไขก่อนค่ะ
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          เอกสารนี้เป็นความลับ — รบกวนกดยอมรับเงื่อนไขที่หน้ารายชื่อทาเลนต์ก่อน
          แล้วค่อยกลับมาเปิดลิงก์นี้อีกครั้งค่ะ
        </p>
        <a
          href={`/p/${token}`}
          className="mt-5 inline-block rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-3 text-sm font-bold text-white"
        >
          ไปหน้ารายชื่อทาเลนต์
        </a>
      </Shell>
    );
  }

  await bumpViewCount(link.id, link.view_count);

  return (
    <div className="bg-neutral-100 py-6 print:bg-white print:py-0">
      <CastingReportView id={link.project_id} forClient />
    </div>
  );
}
