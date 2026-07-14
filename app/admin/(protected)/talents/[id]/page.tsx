import { deleteTalent, getTalent } from "@/actions/talents";
import { LineLinkButton } from "@/components/admin/LineLinkButton";
import { TalentForm } from "@/components/talent/TalentForm";
import { TalentPhotos } from "@/components/talent/TalentPhotos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <TalentPhotos talentId={id} />
      <TalentForm talent={talent} error={error} />
    </div>
  );
}
