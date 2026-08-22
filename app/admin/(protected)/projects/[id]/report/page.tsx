import { CastingReportView } from "@/components/report/CastingReportView";

// Report ส่งลูกค้า — เนื้อหาจริงอยู่ที่ components/report/CastingReportView.tsx
// (ใช้ร่วมกับลิงก์ /r/[token] ที่ส่งให้ลูกค้าเปิดเอง)
export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CastingReportView id={id} />;
}
