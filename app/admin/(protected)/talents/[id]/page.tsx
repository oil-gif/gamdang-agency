import Link from "next/link";
import { deleteTalent, getTalent } from "@/actions/talents";
import { LineLinkButton } from "@/components/admin/LineLinkButton";
import { CompcardStudio } from "@/components/compcard/CompcardStudio";
import { TalentForm } from "@/components/talent/TalentForm";
import { TalentPhotos } from "@/components/talent/TalentPhotos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditTalentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { id } = await params;
  const { error, from } = await searchParams;
  const talent = await getTalent(id);

  // ?from=/admin/projects/xxx → ปุ่มกลับไปหน้าที่มา (เฉพาะ path ภายในเว็บ
  // กัน open-redirect) ไม่งั้นกลับรายการ Talent ตามเดิม
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : null;
  const backLabel = backHref?.startsWith("/admin/projects")
    ? "← กลับหน้าโปรเจกต์"
    : "← กลับรายการ Talent";

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={backHref ?? "/admin/talents"}
        className="inline-block text-sm font-medium text-[#1D4ED8] hover:underline"
      >
        {backLabel}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          แก้ไข: {talent.nickname_th}
        </h1>
        <form action={deleteTalent}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm">
            ลบ Talent
          </Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>บัญชี LINE</CardTitle>
        </CardHeader>
        <CardContent>
          {talent.line_user_id ? (
            <p className="text-sm text-neutral-600">
              ผูกบัญชี LINE แล้ว: {talent.line_display_name ?? "(ไม่มีชื่อ)"}
            </p>
          ) : (
            <LineLinkButton talentId={id} />
          )}
        </CardContent>
      </Card>
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

      <TalentForm talent={talent} error={error} />
    </div>
  );
}
