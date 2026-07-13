import { deletePhoto, getTalentPhotos } from "@/actions/photos";
import { PhotoUploader } from "@/components/talent/PhotoUploader";
import { getPhotoProxyUrl } from "@/lib/storage";

function DeleteButton({ id, talentId }: { id: string; talentId: string }) {
  return (
    <form action={deletePhoto}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="talent_id" value={talentId} />
      <button
        type="submit"
        aria-label="ลบรูป"
        className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

export async function TalentPhotos({ talentId }: { talentId: string }) {
  const photos = await getTalentPhotos(talentId);
  const compcard = photos.find((p) => p.kind === "compcard");
  const gallery = photos.filter((p) => p.kind === "gallery");

  return (
    <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          รูปภาพ <span className="font-normal text-[#1D4ED8]/60">(Photos)</span>
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Comp Card คือรูปหลัก (แนวนอน) ส่วน Gallery เพิ่มได้หลายรูป
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-600">Comp Card</h3>
        {compcard ? (
          <div className="group relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPhotoProxyUrl(compcard.storage_path)}
              alt="Comp Card"
              className="absolute inset-0 size-full object-cover"
            />
            <DeleteButton id={compcard.id} talentId={talentId} />
          </div>
        ) : (
          <div className="flex aspect-video w-full max-w-md items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-400">
            ยังไม่มี Comp Card
          </div>
        )}
        <PhotoUploader
          talentId={talentId}
          kind="compcard"
          label={compcard ? "เปลี่ยน Comp Card" : "อัพโหลด Comp Card"}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-600">
          Gallery ({gallery.length})
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoProxyUrl(p.storage_path)}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <DeleteButton id={p.id} talentId={talentId} />
            </div>
          ))}
        </div>
        <PhotoUploader talentId={talentId} kind="gallery" label="+ เพิ่มรูป Gallery" />
      </div>
    </section>
  );
}
