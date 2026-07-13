import { redirect } from "next/navigation";
import { getTalent } from "@/actions/talents";
import { TalentForm } from "@/components/talent/TalentForm";
import { TalentPhotos } from "@/components/talent/TalentPhotos";
import { getTalentSession } from "@/lib/auth/talent-session";

export default async function ApplyEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");

  const { error, saved } = await searchParams;
  const talent = await getTalent(session.talentId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800">แก้ไขข้อมูลของฉัน</h1>
      {saved && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          บันทึกข้อมูลเรียบร้อยแล้ว
        </div>
      )}
      <TalentPhotos talentId={session.talentId} />
      <TalentForm talent={talent} error={error} mode="self" />
    </div>
  );
}
