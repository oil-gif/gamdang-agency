import Link from "next/link";
import {
  clearAwaitingCompcard,
  getAwaitingCompcardTalents,
} from "@/actions/talents";
import { Button } from "@/components/ui/button";
import { calculateAge } from "@/lib/age";
import { getPhotoProxyUrl } from "@/lib/storage";

// คิว "รอคอมการ์ดจากแก้มแดง" — คนที่จองถ่ายโปรไฟล์แล้วสมัครไว้ก่อน
// (เลือกตัวเลือกที่ 3 ในขั้นรูป) รอทีมงานถ่าย/ตัดต่อเสร็จแล้วอัพคอมการ์ดให้
export default async function CompcardQueuePage() {
  const talents = await getAwaitingCompcardTalents();
  const ready = talents.filter((t) => t.has_compcard);
  // อ่านเวลาครั้งเดียวตอน render ฝั่ง server (ไม่เรียกใน loop)
  const now = new Date().getTime();

  const waitedDays = (iso: string | null) =>
    iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86400000)) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          ⏳ รอคอมการ์ดจากแก้มแดง ({talents.length})
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          คนที่จองถ่ายโปรไฟล์แล้วสมัครไว้ก่อน (ยังไม่มีคอมการ์ด) — เมื่อถ่าย/ตัดต่อเสร็จ
          ให้กด <b>&quot;อัพคอมการ์ด&quot;</b> เข้าโปรไฟล์เขา แล้วระบบจะเอาออกจากคิวให้อัตโนมัติ
        </p>
      </div>

      {ready.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ มี {ready.length} คนที่อัพคอมการ์ดแล้ว — กด &quot;เสร็จแล้ว&quot;
          เพื่อเอาออกจากคิวได้เลย
        </div>
      )}

      {talents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
          ไม่มีใครรอคอมการ์ด 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {talents.map((t) => {
            const days = waitedDays(t.compcard_awaiting_at);
            return (
              <div
                key={t.id}
                className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                  t.has_compcard ? "border-emerald-300" : "border-neutral-200"
                }`}
              >
                <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-neutral-100">
                  {t.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(t.photo_path, 320)}
                      alt=""
                      className="size-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-neutral-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link
                      href={`/admin/talents/${t.id}`}
                      className="font-semibold text-neutral-800 hover:text-[#1D4ED8]"
                    >
                      {t.nickname_en || t.nickname_th || "(ไม่มีชื่อ)"}
                    </Link>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {t.code}
                    </span>
                    {t.has_compcard ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ✓ มีคอมการ์ดแล้ว
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        รอ {days} วัน
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {t.dob ? `${calculateAge(t.dob)} ปี` : ""}
                    {t.height_cm ? ` · ${t.height_cm} ซม.` : ""}
                    {t.weight_kg ? ` · ${t.weight_kg} กก.` : ""}
                  </p>
                  {t.phone && (
                    <p className="text-xs text-neutral-400">📞 {t.phone}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm">
                      <Link href={`/admin/talents/${t.id}#compcard`}>
                        {t.has_compcard ? "ดู/เปลี่ยนคอมการ์ด" : "+ อัพคอมการ์ด"}
                      </Link>
                    </Button>
                    <form action={clearAwaitingCompcard}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" size="sm" variant="outline">
                        เสร็จแล้ว (เอาออกจากคิว)
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
