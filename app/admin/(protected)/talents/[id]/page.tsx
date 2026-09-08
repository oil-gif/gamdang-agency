import Link from "next/link";
import {
  deleteTalent,
  promoteDraftTalent,
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
        : backHref?.startsWith("/admin/shoots")
          ? "← กลับหน้าจองถ่ายโปรไฟล์"
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

      {/* ใบร่างจาก "เพิ่มด่วนจากคอมการ์ด" — เตือนว่ายังไม่อยู่ในระบบจริง
          และให้ทางย้ายเข้าคิวอนุมัติเมื่อข้อมูลครบ (พี่เจ้าของแจ้ง 2026-09-08) */}
      {talent.status === "draft" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-800">
              ⚡ ใบร่าง — สร้างจากคอมการ์ด ยังไม่เข้าระบบ Talent
            </p>
            <p className="mt-0.5 text-xs text-sky-700/80">
              ใช้เสนอลูกค้าในโปรเจกต์ได้เลย · <b>ยังไม่ขึ้นหน้าเว็บ Public</b> ·
              กรอกข้อมูลให้ครบแล้วกดปุ่มขวาเพื่อส่งเข้าคิวรออนุมัติ
            </p>
          </div>
          <form action={promoteDraftTalent}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              ✓ ย้ายเข้าระบบ Talent (รออนุมัติ)
            </button>
          </form>
        </div>
      )}

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
