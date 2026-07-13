import { getTalent } from "@/actions/talents";
import { TalentForm } from "@/components/admin/TalentForm";
import { TalentPhotos } from "@/components/admin/TalentPhotos";

export default async function EditTalentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const talent = await getTalent(id);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-neutral-800">
        แก้ไข: {talent.nickname_th}
      </h1>
      <TalentPhotos talentId={id} />
      <TalentForm talent={talent} error={error} />
    </div>
  );
}
