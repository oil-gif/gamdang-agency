import Link from "next/link";
import {
  deleteTalent,
  getTalent,
  getTalentAdminSummary,
} from "@/actions/talents";
import { TalentProfileHeader } from "@/components/admin/TalentProfileHeader";
import { CompcardStudio } from "@/components/compcard/CompcardStudio";
import { TalentForm } from "@/components/talent/TalentForm";
import { TalentPhotos } from "@/components/talent/TalentPhotos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerConfirmButton } from "@/components/admin/DangerConfirmButton";
import { FALLBACK_PHRASE, hasDangerCode } from "@/lib/danger";

export default async function EditTalentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; from?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, from, saved } = await searchParams;
  const [talent, summary] = await Promise.all([
    getTalent(id),
    getTalentAdminSummary(id),
  ]);

  // ?from=/admin/projects/xxx → ปุ่มกลับไปหน้าที่มา (เฉพาะ path ภายในเว็บ
  // กัน open-redirect) ไม่งั้นกลับรายการ Talent ตามเดิม
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : null;
  const backLabel = backHref?.startsWith("/admin/projects")
    ? "← กลับหน้าโปรเจกต์"
    : backHref?.startsWith("/admin/approvals")
      ? "← กลับหน้ารออนุมัติ"
      : backHref?.startsWith("/admin/compcards")
        ? "← กลับคิวรอคอมการ์ด"
        : backHref === "/admin"
          ? "← กลับ Dashboard"
          : "← กลับรายการ Talent";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref ?? "/admin/talents"}
          className="text-sm font-medium text-[#1D4ED8] hover:underline"
        >
          {backLabel}
        </Link>
        <DangerConfirmButton
          action={deleteTalent}
          hiddenFields={{ id }}
          label="ลบ Talent"
          title={`ลบประวัติ "${talent.nickname_en || talent.nickname_th || talent.code}" ถาวร?`}
          description="ข้อมูลโปรไฟล์ รูปภาพ และประวัติงานทั้งหมดจะถูกลบ — กู้คืนไม่ได้"
          confirmLabel="ลบประวัติถาวร"
          needsCode={hasDangerCode()}
          fallbackPhrase={FALLBACK_PHRASE}
        />
      </div>

      {/* แถบสรุป: รูป/ชื่อ/ป้าย/ความครบ/งานที่เคยอยู่ + ปุ่มที่ใช้บ่อย */}
      {saved && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ บันทึกข้อมูลเรียบร้อยแล้ว
        </p>
      )}
      <TalentProfileHeader talent={talent} summary={summary} />

      <TalentPhotos
        talentId={id}
        label={[talent.code, talent.nickname_en || talent.nickname_th]
          .filter(Boolean)
          .join("-")}
      />

      {/* Comp Card Studio — อัพรูป 4 ช่องบังคับ + สร้างการ์ดอัตโนมัติ
          (อัพคอมการ์ดจากระบบเก่าได้ที่ส่วน "รูปภาพ" ด้านบนเหมือนเดิม) */}
      <Card id="compcard" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            Comp Card Studio{" "}
            <span className="font-normal text-[#1D4ED8]/60">
              — อัพรูป 4 ช่อง แล้วระบบสร้างการ์ดให้
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompcardStudio
            talent={talent}
            initialSlots={
              (talent.compcard_slots ?? {}) as Record<string, string>
            }
          />
        </CardContent>
      </Card>

      <TalentForm talent={talent} error={error} from={from} />
    </div>
  );
}
