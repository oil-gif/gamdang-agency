import { deletePhoto, getTalentPhotos } from "@/actions/photos";
import { PhotoUploader } from "@/components/talent/PhotoUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPhotoUrl } from "@/lib/storage";

export async function TalentPhotos({ talentId }: { talentId: string }) {
  const photos = await getTalentPhotos(talentId);
  const compcard = photos.find((p) => p.kind === "compcard");
  const gallery = photos.filter((p) => p.kind === "gallery");

  return (
    <Card>
      <CardHeader>
        <CardTitle>รูปภาพ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-600">
            Comp Card (รูปเดียว, แนวนอน)
          </h4>
          {compcard && (
            <div className="w-48 space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(compcard.storage_path)}
                alt="comp card"
                className="w-48 rounded-md border object-cover"
              />
              <form action={deletePhoto}>
                <input type="hidden" name="id" value={compcard.id} />
                <input type="hidden" name="talent_id" value={talentId} />
                <Button type="submit" variant="ghost" size="sm">
                  ลบ
                </Button>
              </form>
            </div>
          )}
          <PhotoUploader
            talentId={talentId}
            kind="compcard"
            label={compcard ? "เปลี่ยน Comp Card" : "อัพโหลด Comp Card"}
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-600">
            Gallery ({gallery.length})
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((p) => (
              <div key={p.id} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPhotoUrl(p.storage_path)}
                  alt=""
                  className="aspect-square w-full rounded-md border object-cover"
                />
                <form action={deletePhoto}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="talent_id" value={talentId} />
                  <Button type="submit" variant="ghost" size="sm" className="w-full">
                    ลบ
                  </Button>
                </form>
              </div>
            ))}
          </div>
          <PhotoUploader talentId={talentId} kind="gallery" label="+ เพิ่มรูป Gallery" />
        </div>
      </CardContent>
    </Card>
  );
}
