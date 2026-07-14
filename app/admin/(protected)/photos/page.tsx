import {
  assignInboxPhoto,
  deleteInboxPhoto,
  getAssignableTalents,
  getInboxPhotos,
} from "@/actions/photo-inbox";
import { InboxUploader } from "@/components/admin/InboxUploader";
import { Button } from "@/components/ui/button";

// Photo Inbox: อัพรูปเป็น batch แล้วค่อยกดมอบหมายทีละรูปว่าเป็นรูป
// Gallery/Comp Card ของ talent คนไหน
export default async function PhotosInboxPage() {
  const [photos, talents] = await Promise.all([
    getInboxPhotos(),
    getAssignableTalents(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            รูปภาพ — Batch Upload ({photos.length} รอมอบหมาย)
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            อัพรูปทีเดียวหลายไฟล์ (ระบบย่อไฟล์อัตโนมัติ) แล้วเลือกว่าแต่ละรูปเป็นของใคร
          </p>
        </div>
        <InboxUploader />
      </div>

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-14 text-center text-neutral-400">
          ไม่มีรูปค้างมอบหมาย — กด &quot;⬆️ อัพโหลดรูปหลายไฟล์&quot; เพื่อเริ่ม
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <div className="aspect-[3/4] bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/photo/${p.storage_path}`}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover object-top"
                />
              </div>
              <form action={assignInboxPhoto} className="space-y-2 p-3">
                <input type="hidden" name="inbox_id" value={p.id} />
                <select
                  name="talent_id"
                  required
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm"
                >
                  <option value="" disabled>
                    เลือก Talent...
                  </option>
                  {talents.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.nickname_th ?? t.nickname_en ?? "(ไม่มีชื่อ)"}
                    </option>
                  ))}
                </select>
                <select
                  name="kind"
                  defaultValue="gallery"
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm"
                >
                  <option value="gallery">รูป Gallery</option>
                  <option value="compcard">Comp Card (แทนที่ใบเดิม)</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">
                    ✓ มอบหมาย
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    formAction={deleteInboxPhoto}
                    formNoValidate
                  >
                    ลบ
                  </Button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
